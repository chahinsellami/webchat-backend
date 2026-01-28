# WebChat Backend Server

A real-time messaging and WebRTC signaling server powering the WebChat application. Built with Node.js and Socket.IO for instant messaging, presence tracking, and peer-to-peer voice/video call establishment.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js)](https://nodejs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?logo=socket.io)](https://socket.io/)
[![Express](https://img.shields.io/badge/Express-5.1-000000?logo=express)](https://expressjs.com/)

## ✨ Features

- **Real-time Messaging** - Instant message delivery with Socket.IO
- **Presence Tracking** - Online/offline status broadcasting
- **Typing Indicators** - Live typing status for better user experience
- **WebRTC Signaling** - Voice and video call negotiation
- **ICE Candidate Exchange** - NAT traversal for peer-to-peer connections
- **Health Monitoring** - Status endpoint for deployment health checks
- **Security** - CORS, helmet, compression middleware

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| **Runtime** | Node.js 18+ |
| **Framework** | Express 5.1 |
| **Real-time** | Socket.IO 4.8 |
| **Security** | Helmet, CORS, HPP, Express Rate Limit |
| **Performance** | Compression, dotenv |

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/chahinsellami/webchat-backend.git
cd webchat-backend

# Install dependencies
npm install
```

### Environment Configuration

Create `.env` file in root directory:

```env
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### Run Locally

```bash
npm start
```

Server will run on **http://localhost:3001**

Check health: **http://localhost:3001/health**

## 📦 Deployment

### Option 1: Railway

1. Go to [railway.app](https://railway.app)
2. Connect GitHub repository
3. Set `FRONTEND_URL` environment variable
4. Deploy

### Option 2: Render

1. Go to [render.com](https://render.com)
2. Create new Web Service from GitHub
3. Set environment variables
4. Deploy

## 📡 API Reference

### HTTP Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Health check |
| `/health` | GET | Server status with metrics |

**Health Response:**
```json
{
  "status": "ok",
  "service": "WebChat Socket.IO Server",
  "activeUsers": 5,
  "timestamp": "2024-01-28T10:30:00.000Z",
  "uptime": 3600,
  "memory": {...}
}
```

### Socket.IO Events

#### Client → Server

| Event | Payload | Purpose |
|-------|---------|---------|
| `join` | `{userId}` | Register user connection |
| `send-message` | `{messageId, senderId, receiverId, text}` | Send message |
| `typing` | `{senderId, receiverId, isTyping}` | Typing indicator |
| `call-user` | `{from, to, signal, callType}` | Initiate call |
| `accept-call` | `{to, signal}` | Accept call |
| `reject-call` | `{to}` | Reject call |
| `end-call` | `{to}` | End call |
| `ice-candidate` | `{to, candidate}` | WebRTC ICE candidate |

#### Server → Client

| Event | Payload | Purpose |
|-------|---------|---------|
| `user-online` | `{userId}` | User came online |
| `user-offline` | `{userId}` | User went offline |
| `receive-message` | `{messageId, senderId, text}` | Receive message |
| `user-typing` | `{userId, isTyping}` | User typing status |
| `incoming-call` | `{from, signal, callType}` | Incoming call |
| `call-accepted` | `{signal}` | Call accepted |
| `call-rejected` | - | Call rejected |
| `call-ended` | - | Call ended |
| `ice-candidate` | `{candidate}` | ICE candidate from peer |

## 🏗️ Architecture

**Connection Flow:**
1. Client connects via WebSocket
2. Client emits `join` with userId
3. Server stores userId ↔ socketId mapping
4. Server broadcasts `user-online` to other clients

**Message Flow:**
1. Sender emits `send-message`
2. Server forwards to receiver's socket
3. Receiver displays instantly
4. No server storage (handled by database)

**WebRTC Call Flow:**
1. Caller creates offer → emits `call-user`
2. Server forwards via `incoming-call` to receiver
3. Receiver creates answer → emits `accept-call`
4. Both peers exchange ICE candidates
5. P2P connection established (media bypasses server)

## 🧪 Development

**Auto-reload on changes:**
```bash
npm run dev
```

**Run tests:**
```bash
npm test
npm run test:coverage
```

**Project Structure:**
```
backend-server/
├── server.js           # Main Socket.IO + Express server
├── package.json        # Dependencies
├── .env                # Environment variables (create from .env.example)
├── .env.example        # Template
└── tests/              # Test suite
```

## 🔒 Security

- **CORS** - Restricts to specified frontend URLs only
- **Helmet** - HTTP headers security
- **Compression** - Response compression
- **Rate Limiting** - Built-in request throttling
- **No Auth** - Auth handled by frontend API
- **No Storage** - No sensitive data kept in memory

## 🚨 Troubleshooting

**Port Already in Use:**
```powershell
# Windows
Get-Process node | Stop-Process -Force

# Linux/Mac
lsof -i :3001 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

**CORS Errors:**
- Verify `FRONTEND_URL` matches frontend exactly
- Check http/https protocols match
- Ensure `NEXT_PUBLIC_SOCKET_URL` on frontend points to this server

**Connection Failed:**
- Check both server and frontend are running
- Verify firewall allows port 3001
- Check browser console for WebSocket errors
- Test health endpoint: `curl http://localhost:3001/health`

**WebRTC Call Issues:**
- Ensure both users are online
- Grant browser camera/microphone permissions
- Check ICE candidate exchange in browser DevTools
- Test peer-to-peer connectivity

## 📝 Development Notes

- Server logs all Socket.IO events for debugging
- Health endpoint useful for uptime monitoring
- Memory usage scales linearly with active connections (~100 bytes/user)
- CPU usage minimal (just forwarding)
- Can handle thousands of concurrent connections

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/name`)
3. Make changes with clear comments
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - Open source and free for any use

---

**Repository:** [github.com/chahinsellami/webchat-backend](https://github.com/chahinsellami/webchat-backend)  
**Frontend:** [github.com/chahinsellami/chatapp](https://github.com/chahinsellami/chatapp)
