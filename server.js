/**
 * WebChat Backend Server
 *
 * Real-time messaging and WebRTC signaling server for the WebChat application.
 * Handles Socket.IO connections for instant messaging, typing indicators,
 * presence tracking, and peer-to-peer voice/video call signaling.
 *
 * Features:
 * - Real-time direct messaging between users
 * - Typing indicator broadcasting
 * - Online/offline presence tracking
 * - WebRTC signaling for voice/video calls
 * - ICE candidate exchange for P2P connections
 * - Health check endpoint for monitoring
 *
 * @requires http - Node.js HTTP server module
 * @requires socket.io - Real-time bidirectional event-based communication
 * @requires dotenv - Environment variable management
 */

import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

/**
 * Server configuration constants
 * PORT: The port number the server will listen on (default: 3001)
 * FRONTEND_URL: The URL of the frontend application for CORS configuration
 */
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

/**
 * Create HTTP server
 * This server handles both HTTP requests (for health checks) and
 * WebSocket connections (for Socket.IO real-time communication)
 */
const httpServer = createServer();

/**
 * Create Socket.IO server instance with CORS configuration
 *
 * CORS settings allow the frontend application to connect from different origins.
 * Supports multiple origins including localhost and Vercel deployments.
 *
 * Transports:
 * - websocket: Preferred real-time bidirectional communication protocol
 * - polling: Fallback mechanism for environments that don't support WebSocket
 */
const io = new Server(httpServer, {
  cors: {
    origin: function (origin, callback) {
      const allowedOrigins = [
        FRONTEND_URL,
        "http://localhost:3000",
        "https://chatapp-two-drab.vercel.app",
      ];
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

/**
 * Active User Storage
 *
 * users: Maps userId (string) to socketId (string)
 *        Used to find which socket to send messages to when targeting a specific user
 *        Example: users.set("user-123", "socket-abc") means user-123 is connected via socket-abc
 *
 * socketToUser: Maps socketId (string) to userId (string)
 *               Reverse lookup to identify which user a socket belongs to
 *               Used during disconnect to clean up user data
 *               Example: socketToUser.set("socket-abc", "user-123")
 */
const users = new Map();
const socketToUser = new Map();

/**
 * Socket.IO Connection Handler
 *
 * Triggered when a client successfully establishes a WebSocket connection.
 * Each connected client gets a unique socket object with a socket.id.
 *
 * @param {Socket} socket - The socket instance representing this connection
 */
io.on("connection", (socket) => {
  console.log(`✓ Socket connected: ${socket.id}`);

  /**
   * Join Event Handler
   *
   * Called when a user identifies themselves after connecting.
   * Associates the user's ID with their socket ID for message routing.
   * Broadcasts to other users that this user is now online.
   *
   * @event join
   * @param {string} userId - The unique identifier of the user joining
   */
  socket.on("join", (userId) => {
    // Validate that userId was provided
    if (!userId) {
      console.warn("⚠️  Join event received without userId");
      return;
    }

    // Store bidirectional mappings for quick lookups
    users.set(userId, socket.id);
    socketToUser.set(socket.id, userId);

    console.log(`👤 User ${userId} joined with socket ${socket.id}`);
    console.log(`📊 Active users: ${Array.from(users.keys()).join(", ")}`);

    /**
     * Notify all other connected clients that this user is now online
     * Uses broadcast to send to everyone except the sender
     */
    socket.broadcast.emit("user-online", userId);
  });

  /**
   * Send Message Event Handler
   *
   * Routes direct messages from one user to another in real-time.
   * Messages are NOT stored in the database here - that's handled by the API.
   * This server only delivers messages to online users instantly.
   *
   * Flow:
   * 1. Sender emits 'send-message' with message data
   * 2. Server receives it and looks up receiver's socket
   * 3. Server emits 'receive-message' to receiver's socket only
   * 4. Receiver's client displays the message instantly
   *
   * @event send-message
   * @param {Object} data - Message data object
   * @param {string} data.messageId - Unique ID for the message
   * @param {string} data.senderId - User ID of the sender
   * @param {string} data.receiverId - User ID of the receiver
   * @param {string} data.text - The message content
   * @param {string} data.createdAt - ISO timestamp of message creation
   */
  socket.on("send-message", (data) => {
    console.log("📨 Message received on server:", {
      messageId: data.messageId,
      from: data.senderId,
      to: data.receiverId,
      text: data.text,
    });

    // Look up the receiver's socket ID from their user ID
    const receiverSocketId = users.get(data.receiverId);
    console.log(`👤 Receiver ${data.receiverId} socket: ${receiverSocketId}`);

    // Only send if receiver is online (has an active socket connection)
    if (receiverSocketId) {
      // Send message directly to the receiver's socket
      io.to(receiverSocketId).emit("receive-message", {
        messageId: data.messageId,
        senderId: data.senderId,
        receiverId: data.receiverId,
        text: data.text,
        createdAt: data.createdAt,
      });
      console.log(`✅ Sending message to socket ${receiverSocketId}`);
    } else {
      // Receiver is offline - message will be delivered when they next load the chat
      console.log(`❌ Receiver ${data.receiverId} not connected`);
    }
  });

  /**
   * Typing Indicator Event Handler
   *
   * Broadcasts typing status from one user to another.
   * Shows "User is typing..." indicator in the receiver's UI.
   * Typing indicators are temporary and not stored anywhere.
   *
   * @event typing
   * @param {Object} data - Typing indicator data
   * @param {string} data.senderId - User ID of the person typing
   * @param {string} data.receiverId - User ID who should see the indicator
   * @param {boolean} data.isTyping - true when typing starts, false when stops
   */
  socket.on("typing", (data) => {
    // Look up receiver's socket
    const receiverSocketId = users.get(data.receiverId);

    if (receiverSocketId) {
      // Notify receiver about typing status
      io.to(receiverSocketId).emit("user-typing", {
        userId: data.senderId,
        isTyping: data.isTyping,
      });
    }
  });

  /**
   * ============================================================================
   * WebRTC Signaling for Voice/Video Calls
   * ============================================================================
   *
   * WebRTC (Web Real-Time Communication) enables peer-to-peer audio/video calls.
   * This server acts as a "signaling server" to help two peers establish a
   * direct connection. Once connected, audio/video flows directly between peers,
   * not through this server.
   *
   * Signaling Process:
   * 1. Caller creates an "offer" (connection parameters)
   * 2. Server forwards offer to receiver via 'incoming-call'
   * 3. Receiver creates an "answer" and sends back via 'accept-call'
   * 4. Server forwards answer to caller via 'call-accepted'
   * 5. Both peers exchange ICE candidates for NAT traversal
   * 6. Direct P2P connection established - server no longer involved in media
   *
   * Events handled:
   * - call-user: Initiate a call
   * - accept-call: Accept an incoming call
   * - reject-call: Decline an incoming call
   * - end-call: Terminate an active call
   * - ice-candidate: Exchange ICE candidates for connection establishment
   */

  /**
   * Call User Event Handler
   *
   * Initiates a voice or video call by forwarding the caller's WebRTC offer
   * to the recipient. The offer contains the caller's session description
   * (SDP) with media capabilities and connection information.
   *
   * @event call-user
   * @param {Object} data - Call initiation data
   * @param {string} data.from - User ID of the caller
   * @param {string} data.to - User ID of the person being called
   * @param {RTCSessionDescription} data.signal - WebRTC offer (SDP)
   * @param {string} data.callType - Type of call: "voice" or "video"
   */
  socket.on("call-user", (data) => {
    console.log(`📞 Call initiated:`, {
      from: data.from,
      to: data.to,
      callType: data.callType,
      hasSignal: !!data.signal,
    });

    // Look up recipient's socket
    const receiverSocketId = users.get(data.to);
    console.log(`🔍 Receiver ${data.to} socketId: ${receiverSocketId}`);

    if (receiverSocketId) {
      // Forward the call offer to the recipient
      io.to(receiverSocketId).emit("incoming-call", {
        from: data.from,
        signal: data.signal,
        callType: data.callType,
      });
      console.log(`✅ Call signal sent to ${receiverSocketId}`);
    } else {
      // Recipient is offline - notify caller that call failed
      console.log(`❌ Receiver ${data.to} not connected`);
      socket.emit("call-failed", { reason: "User not online" });
    }
  });

  /**
   * Accept Call Event Handler
   *
   * Called when the recipient accepts an incoming call.
   * Forwards the recipient's WebRTC answer back to the original caller,
   * allowing the P2P connection to be established.
   *
   * @event accept-call
   * @param {Object} data - Call acceptance data
   * @param {string} data.to - User ID of the original caller
   * @param {RTCSessionDescription} data.signal - WebRTC answer (SDP)
   */
  socket.on("accept-call", (data) => {
    console.log(`✅ Call accepted by user, sending to ${data.to}`);

    // Look up caller's socket
    const callerSocketId = users.get(data.to);
    console.log(`🔍 Caller socketId: ${callerSocketId}`);

    if (callerSocketId) {
      // Forward the answer signal to the caller
      io.to(callerSocketId).emit("call-accepted", {
        signal: data.signal,
      });
      console.log(`✅ Acceptance signal sent to ${callerSocketId}`);
    } else {
      // Caller disconnected before call was accepted
      console.log(`❌ Caller ${data.to} no longer connected`);
    }
  });

  /**
   * Reject Call Event Handler
   *
   * Called when the recipient declines an incoming call.
   * Notifies the caller that their call was rejected.
   *
   * @event reject-call
   * @param {Object} data - Call rejection data
   * @param {string} data.to - User ID of the caller to notify
   */
  socket.on("reject-call", (data) => {
    console.log(`❌ Call rejected, notifying ${data.to}`);

    const callerSocketId = users.get(data.to);

    if (callerSocketId) {
      // Notify caller that call was rejected
      io.to(callerSocketId).emit("call-rejected");
      console.log(`✅ Rejection sent to ${callerSocketId}`);
    }
  });

  /**
   * End Call Event Handler
   *
   * Called when either party ends an active call.
   * Notifies the other party so they can clean up their call UI.
   *
   * @event end-call
   * @param {Object} data - Call termination data
   * @param {string} data.to - User ID of the other party in the call
   */
  socket.on("end-call", (data) => {
    console.log(`📵 Call ended, notifying ${data.to}`);

    const otherUserSocketId = users.get(data.to);

    if (otherUserSocketId) {
      // Notify other party that call has ended
      io.to(otherUserSocketId).emit("call-ended");
      console.log(`✅ End call signal sent to ${otherUserSocketId}`);
    }
  });

  /**
   * ICE Candidate Event Handler
   *
   * ICE (Interactive Connectivity Establishment) candidates are network
   * endpoints that WebRTC can use to establish a connection. This handler
   * forwards ICE candidates between peers during connection establishment.
   *
   * Multiple candidates may be exchanged as WebRTC discovers different
   * network paths (local network, NAT, relay servers, etc.).
   *
   * @event ice-candidate
   * @param {Object} data - ICE candidate data
   * @param {string} data.to - User ID to send the candidate to
   * @param {RTCIceCandidate} data.candidate - The ICE candidate object
   */
  socket.on("ice-candidate", (data) => {
    console.log(`🧊 ICE candidate from socket ${socket.id} to user ${data.to}`);

    const receiverSocketId = users.get(data.to);

    if (receiverSocketId) {
      // Forward ICE candidate to the other peer
      io.to(receiverSocketId).emit("ice-candidate", {
        candidate: data.candidate,
      });
      console.log(`✅ ICE candidate sent to ${receiverSocketId}`);
    }
  });

  /**
   * Disconnect Event Handler
   *
   * Automatically triggered when a client's connection is lost.
   * Cleans up user data and notifies other users that this person is offline.
   *
   * Disconnect can happen due to:
   * - User closing the browser/tab
   * - Network connection lost
   * - Server restart
   * - Explicit socket.disconnect() call
   *
   * @event disconnect
   */
  socket.on("disconnect", () => {
    // Look up which user this socket belonged to
    const userId = socketToUser.get(socket.id);

    if (userId) {
      console.log(`👋 User ${userId} disconnected`);

      // Remove user from both maps to free memory
      users.delete(userId);
      socketToUser.delete(socket.id);

      /**
       * Notify all other connected users that this person is offline
       * This updates their online status indicators in real-time
       */
      socket.broadcast.emit("user-offline", userId);
    }
  });
});

/**
 * Health Check HTTP Endpoint
 *
 * Provides a simple HTTP endpoint to verify the server is running.
 * Useful for monitoring tools, load balancers, and deployment platforms.
 *
 * Responds to GET requests at:
 * - / (root path)
 * - /health (explicit health check path)
 *
 * Returns JSON with:
 * - status: "ok" if server is running
 * - service: Name of this service
 * - activeUsers: Number of currently connected users
 * - timestamp: Current server time in ISO format
 *
 * Example response:
 * {
 *   "status": "ok",
 *   "service": "WebChat Socket.IO Server",
 *   "activeUsers": 5,
 *   "timestamp": "2024-11-05T10:30:00.000Z"
 * }
 */
httpServer.on("request", (req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "WebChat Socket.IO Server",
        activeUsers: users.size,
        timestamp: new Date().toISOString(),
      })
    );
  }
});

/**
 * Start HTTP Server
 *
 * Begins listening for connections on the configured PORT.
 * Both HTTP requests (health checks) and WebSocket connections
 * are handled through this same server instance.
 *
 * Once started, the server will:
 * - Accept Socket.IO connections for real-time communication
 * - Respond to health check requests
 * - Log startup information to console
 */
httpServer.listen(PORT, () => {
  console.log(`\n🚀 WebChat Backend Server running on port ${PORT}`);
  console.log(`📡 Socket.IO ready for connections`);
  console.log(`🌐 Accepting connections from: ${FRONTEND_URL}\n`);
});
