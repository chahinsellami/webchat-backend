/**
 * WebChat Backend Server
 *
 * Real-time messaging and WebRTC signaling server for the WebChat application.
 * Handles Socket.IO connections for instant messaging, typing indicators,
 * presence tracking, and peer-to-peer voice/video call signaling.
 */

// Import required modules
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import helmet from "helmet";
import hpp from "hpp";
import compression from "compression";
import cors from "cors";
import "dotenv/config";

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

/**
 * Create HTTP server
 * This server handles both HTTP requests (for health checks) and
 * WebSocket connections (for Socket.IO real-time communication)
 */

// Create Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(hpp());
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// CORS configuration
const allowedOrigins = [
  FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://192.168.100.12:3000",
  "http://192.168.100.12:3001",
  "https://chatapp-two-drab.vercel.app",
];
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST"],
  }),
);

// Health check endpoint
app.get(["/health", "/"], (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "WebChat Socket.IO Server",
    // users may not be defined yet, so fallback to 0
    activeUsers: typeof users !== "undefined" ? users.size : 0,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Create HTTP server from Express app
const httpServer = createServer(app);

/**
 * Create Socket.IO server instance with CORS configuration
 *
 * CORS settings allow the frontend application to connect from different origins.
 * Supports multiple origins including localhost and Vercel deployments.
 *
 * Transports:
 * - websocket: Preferred real-time bidirectional communication protocol
 * - polling: Fallback mechanism for environments that don't support WebSocket
 *
 * Security features:
 * - Connection rate limiting
 * - Origin validation
 * - Connection timeout
 * - Ping timeout for dead connection detection
 */
const io = new Server(httpServer, {
  cors: {
    origin: function (origin, callback) {
      // Allow ngrok URLs and other origins
      const allowedOrigins = [
        FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:3001",
        "http://192.168.100.12:3000",
        "http://192.168.100.12:3001",
        "https://chatapp-two-drab.vercel.app",
      ];

      // Check if origin matches ngrok pattern
      const isNgrok = origin && origin.includes("ngrok");

      if (!origin || allowedOrigins.includes(origin) || isNgrok) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6,
  allowEIO3: true,
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
 * Rate limiting for Socket.IO connections
 * Tracks connection attempts per IP to prevent abuse
 */
const connectionAttempts = new Map();
const MAX_CONNECTIONS_PER_IP = 10;
const CONNECTION_WINDOW = 60000; // 1 minute

/**
 * Clean up connection attempts map periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of connectionAttempts.entries()) {
    if (now - data.timestamp > CONNECTION_WINDOW) {
      connectionAttempts.delete(ip);
    }
  }
}, 60000);

/**
 * Socket.IO Connection Handler
 *
 * Triggered when a client successfully establishes a WebSocket connection.
 * Each connected client gets a unique socket object with a socket.id.
 *
 * @param {Socket} socket - The socket instance representing this connection
 */
io.on("connection", (socket) => {
  // Get client IP address for rate limiting
  const clientIP =
    socket.handshake.headers["x-forwarded-for"] ||
    socket.handshake.address ||
    "unknown";

  console.log(`✓ Socket connected: ${socket.id} from ${clientIP}`);

  // Check connection rate limit
  const now = Date.now();
  const attempts = connectionAttempts.get(clientIP) || {
    count: 0,
    timestamp: now,
  };

  if (
    attempts.count >= MAX_CONNECTIONS_PER_IP &&
    now - attempts.timestamp < CONNECTION_WINDOW
  ) {
    console.warn(`⚠️  Rate limit exceeded for IP: ${clientIP}`);
    socket.emit("error", {
      message: "Too many connection attempts. Please try again later.",
    });
    socket.disconnect(true);
    return;
  }

  // Update connection attempts
  connectionAttempts.set(clientIP, {
    count: attempts.count + 1,
    timestamp: now,
  });

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

    // Send the new user a list of all currently online users (except themselves)
    const onlineUserIds = Array.from(users.keys()).filter(
      (id) => id !== userId,
    );
    socket.emit("user-list", onlineUserIds);
    console.log(`📤 Sent online users list to ${userId}:`, onlineUserIds);

    /**
     * Notify ALL connected clients (including this user) that this user is now online
     * Uses io.emit to send to everyone
     */
    io.emit("user-online", userId);
    io.emit("user-status-change", { userId, status: "online" });
    console.log(`📢 Broadcast user-online for ${userId} to all clients`);
  });

  /**
   * Status Change Event Handler
   *
   * Fired by the client's presence tracker when status changes
   * (online → idle, idle → online, beforeunload → offline, etc.)
   * Broadcasts the status change to all connected clients.
   *
   * @event status-change
   * @param {Object} data - { userId: string, status: string }
   */
  socket.on("status-change", (data) => {
    if (!data || !data.userId || !data.status) return;

    const validStatuses = ["online", "idle", "dnd", "invisible", "offline"];
    if (!validStatuses.includes(data.status)) return;

    console.log(`🔄 Status change: ${data.userId} → ${data.status}`);

    // Broadcast to all connected clients
    io.emit("user-status-change", {
      userId: data.userId,
      status: data.status,
    });
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
   * Security: Validates message content and rate limits
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
    // Validate message data
    if (
      !data ||
      !data.messageId ||
      !data.senderId ||
      !data.receiverId ||
      !data.text
    ) {
      console.warn("⚠️  Invalid message data received");
      return;
    }

    // Check message length
    if (data.text.length > 5000) {
      console.warn("⚠️  Message too long");
      return;
    }

    console.log("📨 Message received on server:", {
      messageId: data.messageId,
      from: data.senderId,
      to: data.receiverId,
      text: data.text.substring(0, 50) + "...", // Log first 50 chars only
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
   * Agora Call Request Event Handler
   *
   * Called when a user initiates a call using Agora.io
   * Sends call notification to the recipient with channel info
   *
   * @event call-request
   * @param {Object} data - Call request data
   * @param {string} data.to - User ID of the person being called
   * @param {string} data.channelName - Agora channel name to join
   * @param {string} data.callType - Type of call: "voice" or "video"
   * @param {string} data.callerName - Display name of the caller
   */
  socket.on("call-request", (data) => {
    console.log(`📞 Agora call initiated:`, {
      from: socket.userId,
      to: data.to,
      channelName: data.channelName,
      callType: data.callType,
      callerName: data.callerName,
    });

    // Look up recipient's socket
    const receiverSocketId = users.get(data.to);
    console.log(`🔍 Receiver ${data.to} socketId: ${receiverSocketId}`);

    if (receiverSocketId) {
      // Forward the call request to the recipient
      io.to(receiverSocketId).emit("incoming-call", {
        from: socket.userId,
        channelName: data.channelName,
        callType: data.callType,
        callerName: data.callerName,
      });
      console.log(`✅ Call request sent to ${receiverSocketId}`);
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
      console.log(`📊 Active users before disconnect: ${Array.from(users.keys()).join(", ")}`);

      // Remove user from both maps to free memory
      users.delete(userId);
      socketToUser.delete(socket.id);

      console.log(`📊 Active users after disconnect: ${Array.from(users.keys()).join(", ")}`);

      /**
       * Notify ALL connected clients that this person is offline
       * Uses io.emit instead of socket.broadcast.emit so all clients get the update
       * This updates their online status indicators in real-time
       */
      io.emit("user-offline", userId);
      io.emit("user-status-change", { userId, status: "offline" });
      console.log(`📢 Broadcast user-offline for ${userId} to all clients`);
    }
  });
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
  console.log(`🌐 Accepting connections from: ${FRONTEND_URL}`);
  console.log(`🔒 Security features enabled`);
  console.log(
    `⏱️  Rate limiting: ${MAX_CONNECTIONS_PER_IP} connections per minute per IP\n`,
  );
});
