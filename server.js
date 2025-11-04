import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// Create HTTP server
const httpServer = createServer();

// Create Socket.IO server with CORS
const io = new Server(httpServer, {
  cors: {
    origin: [FRONTEND_URL, "https://*.vercel.app", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Store active users: userId -> socketId
const users = new Map();
const socketToUser = new Map();

io.on("connection", (socket) => {
  console.log(`✓ Socket connected: ${socket.id}`);

  // User joins with their userId
  socket.on("join", (userId) => {
    if (!userId) {
      console.warn("⚠️  Join event received without userId");
      return;
    }

    users.set(userId, socket.id);
    socketToUser.set(socket.id, userId);

    console.log(`👤 User ${userId} joined with socket ${socket.id}`);
    console.log(`📊 Active users: ${Array.from(users.keys()).join(", ")}`);

    // Notify others that user is online
    socket.broadcast.emit("user-online", userId);
  });

  // Handle direct messages
  socket.on("send-message", (data) => {
      console.log("📨 Message received on server:", {
        messageId: data.messageId,
        from: data.senderId,
        to: data.receiverId,
        text: data.text,
      });

      const receiverSocketId = users.get(data.receiverId);
      console.log(`👤 Receiver ${data.receiverId} socket: ${receiverSocketId}`);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receive-message", {
          messageId: data.messageId,
          senderId: data.senderId,
          receiverId: data.receiverId,
          text: data.text,
          createdAt: data.createdAt,
        });
        console.log(`✅ Sending message to socket ${receiverSocketId}`);
      } else {
        console.log(`❌ Receiver ${data.receiverId} not connected`);
      }
    }
  );

  // Handle typing indicators
  socket.on("typing", (data) => {
    const receiverSocketId = users.get(data.receiverId);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("user-typing", {
          userId: data.senderId,
          isTyping: data.isTyping,
        });
      }
    }
  );

  // WebRTC Signaling for Voice/Video Calls
  socket.on("call-user", (data) => {
      console.log(`📞 Call from ${data.from} to ${data.to}`);
      const receiverSocketId = users.get(data.to);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("incoming-call", {
          from: data.from,
          signal: data.signal,
          callType: data.callType,
        });
      }
    }
  );

  socket.on("accept-call", (data) => {
    const callerSocketId = users.get(data.to);

    if (callerSocketId) {
      io.to(callerSocketId).emit("call-accepted", {
        signal: data.signal,
      });
    }
  });

  socket.on("reject-call", (data) => {
    const callerSocketId = users.get(data.to);

    if (callerSocketId) {
      io.to(callerSocketId).emit("call-rejected");
    }
  });

  socket.on("end-call", (data) => {
    const otherUserSocketId = users.get(data.to);

    if (otherUserSocketId) {
      io.to(otherUserSocketId).emit("call-ended");
    }
  });

  // ICE candidate exchange
  socket.on("ice-candidate", (data) => {
    const receiverSocketId = users.get(data.to);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("ice-candidate", {
        candidate: data.candidate,
      });
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    const userId = socketToUser.get(socket.id);

    if (userId) {
      console.log(`👋 User ${userId} disconnected`);
      users.delete(userId);
      socketToUser.delete(socket.id);

      // Notify others that user is offline
      socket.broadcast.emit("user-offline", userId);
    }
  });
});

// Health check endpoint
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

httpServer.listen(PORT, () => {
  console.log(`\n🚀 WebChat Backend Server running on port ${PORT}`);
  console.log(`📡 Socket.IO ready for connections`);
  console.log(`🌐 Accepting connections from: ${FRONTEND_URL}\n`);
});
