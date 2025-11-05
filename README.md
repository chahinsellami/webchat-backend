# WebChat Backend Server

Real-time messaging and WebRTC signaling server for the WebChat application. Built with Socket.IO and Node.js.

## Features

- **Real-time Messaging** - Instant message delivery between connected users
- **Presence Tracking** - Online/offline status broadcasting
- **Typing Indicators** - Live typing status for better UX
- **WebRTC Signaling** - Voice and video call establishment
- **ICE Candidate Exchange** - NAT traversal for P2P connections
- **Health Monitoring** - HTTP endpoint for server status checks

## Tech Stack

- **Node.js** - JavaScript runtime
- **Socket.IO** - Real-time bidirectional communication
- **HTTP** - Health check endpoint
- **dotenv** - Environment configuration

## Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Configure environment variables
# Edit .env and set PORT and FRONTEND_URL

# Start the server
npm start
```

## Development

For development with auto-reload on file changes:

```bash
npm run dev
```

## Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3001                              # Server port (Railway auto-assigns in production)
FRONTEND_URL=http://localhost:3000    # Frontend URL for CORS
```

## API Endpoints

### HTTP Endpoints

| Endpoint | Method | Description                    |
| -------- | ------ | ------------------------------ |
| `/`      | GET    | Health check (returns status)  |
| `/health`| GET    | Health check (returns status)  |

**Response Format:**
```json
{
  "status": "ok",
  "service": "WebChat Socket.IO Server",
  "activeUsers": 5,
  "timestamp": "2024-11-05T10:30:00.000Z"
}
```

### Socket.IO Events

#### Client → Server Events

| Event           | Payload                                      | Description                          |
| --------------- | -------------------------------------------- | ------------------------------------ |
| `join`          | `userId: string`                             | User identifies themselves           |
| `send-message`  | `{ messageId, senderId, receiverId, text }`  | Send direct message                  |
| `typing`        | `{ senderId, receiverId, isTyping }`         | Typing indicator                     |
| `call-user`     | `{ from, to, signal, callType }`             | Initiate voice/video call            |
| `accept-call`   | `{ to, signal }`                             | Accept incoming call                 |
| `reject-call`   | `{ to }`                                     | Reject incoming call                 |
| `end-call`      | `{ to }`                                     | End active call                      |
| `ice-candidate` | `{ to, candidate }`                          | Exchange ICE candidate for WebRTC    |

#### Server → Client Events

| Event            | Payload                                     | Description                          |
| ---------------- | ------------------------------------------- | ------------------------------------ |
| `user-online`    | `userId: string`                            | User came online                     |
| `user-offline`   | `userId: string`                            | User went offline                    |
| `receive-message`| `{ messageId, senderId, receiverId, text }` | Receive direct message               |
| `user-typing`    | `{ userId, isTyping }`                      | User typing status changed           |
| `incoming-call`  | `{ from, signal, callType }`                | Incoming call notification           |
| `call-accepted`  | `{ signal }`                                | Call was accepted                    |
| `call-rejected`  | -                                           | Call was rejected                    |
| `call-ended`     | -                                           | Call was terminated                  |
| `call-failed`    | `{ reason }`                                | Call failed (user offline)           |
| `ice-candidate`  | `{ candidate }`                             | ICE candidate for WebRTC             |

## Architecture

### Connection Flow

1. **Client Connects** → WebSocket connection established
2. **User Joins** → Client emits `join` with userId
3. **Server Maps** → Stores userId ↔ socketId mapping
4. **Broadcast Online** → Notifies other users

### Message Flow

1. **Sender** emits `send-message` with message data
2. **Server** receives and looks up receiver's socketId
3. **Server** emits `receive-message` to receiver's socket only
4. **Receiver** displays message instantly

### Call Flow (WebRTC Signaling)

1. **Caller** creates offer and emits `call-user`
2. **Server** forwards offer via `incoming-call` to receiver
3. **Receiver** creates answer and emits `accept-call`
4. **Server** forwards answer via `call-accepted` to caller
5. **Both peers** exchange ICE candidates via `ice-candidate`
6. **P2P connection** established (media bypasses server)

## Deployment

### Deploy to Railway

1. **Prepare repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connect to Railway**
   - Go to [railway.app](https://railway.app)
   - Create new project from GitHub
   - Select this repository

3. **Configure environment**
   - Set `FRONTEND_URL` to your deployed frontend URL
   - Railway auto-assigns `PORT` - no need to set manually

4. **Deploy**
   - Railway auto-deploys on push to main branch
   - View logs in Railway dashboard
   - Copy the public URL for your frontend config

### Deploy to Other Platforms

**Heroku:**
```bash
heroku create your-app-name
heroku config:set FRONTEND_URL=https://your-frontend.vercel.app
git push heroku main
```

**Render:**
- Connect GitHub repository
- Set environment variables in dashboard
- Deploy with one click

## Development Guide

### Project Structure

```
backend-server/
├── server.js           # Main server file (Socket.IO + HTTP)
├── package.json        # Dependencies and scripts
├── .env                # Environment variables (create this)
├── .env.example        # Environment template
└── README.md           # This file
```

### Code Organization

**server.js** contains:
- HTTP server creation
- Socket.IO configuration with CORS
- User mapping storage (userId ↔ socketId)
- Event handlers for all Socket.IO events
- Health check endpoint
- Server startup logic

All code is thoroughly commented with:
- File-level documentation
- Function/handler documentation
- Inline explanations for complex logic
- Event parameter descriptions

### Testing Locally

1. **Start backend server:**
   ```bash
   npm start
   ```

2. **Start frontend app:**
   ```bash
   cd ../webchat-app
   npm run dev
   ```

3. **Open multiple browser tabs:**
   - http://localhost:3000 (Tab 1)
   - http://localhost:3000 (Tab 2)
   - Login as different users
   - Send messages and see real-time delivery

4. **Check health endpoint:**
   ```bash
   curl http://localhost:3001/health
   ```

## Troubleshooting

### Port Already in Use

**Windows:**
```powershell
Get-Process node | Stop-Process -Force
```

**Linux/Mac:**
```bash
lsof -i :3001 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### CORS Errors

- Ensure `FRONTEND_URL` in `.env` matches your frontend URL exactly
- Check that frontend's `NEXT_PUBLIC_SOCKET_URL` points to this server
- Verify both http/https protocols match

### Connection Issues

- Check that both frontend and backend are running
- Verify network connectivity (firewall, VPN)
- Check browser console for WebSocket errors
- Review server logs for connection attempts

### WebRTC Call Issues

- Ensure both peers are online and connected
- Check browser permissions for camera/microphone
- Review ICE candidate exchange in network tab
- Test with STUN/TURN servers if behind restrictive NAT

## Monitoring

### Server Logs

The server logs all important events:

- ✓ Socket connections
- 👤 User joins/disconnects
- 📨 Message routing
- 📞 Call signaling
- 🧊 ICE candidate exchanges
- ❌ Errors and warnings

### Health Checks

Query the health endpoint periodically:

```bash
curl http://localhost:3001/health
```

Use for:
- Deployment health checks
- Monitoring tools (UptimeRobot, Pingdom)
- Load balancer health probes

## Security Considerations

- **CORS** - Restricts connections to specified origins
- **No Authentication** - Auth handled by frontend API
- **No Message Storage** - Messages stored in database, not here
- **Transport Security** - Use WSS (WebSocket Secure) in production
- **Rate Limiting** - Consider adding for production

## Performance

- **Memory Usage** - Maps scale with active users (~100 bytes/user)
- **CPU Usage** - Minimal (just forwarding messages)
- **Network** - Scales well (P2P media doesn't go through server)
- **Connections** - Can handle thousands of concurrent WebSocket connections

## Contributing

Contributions welcome! To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper comments
4. Test thoroughly
5. Submit a pull request

## License

MIT License - Free for personal and commercial use.

## Support

For help:
- Check server logs in terminal
- Review code comments in `server.js`
- Test health endpoint: `curl http://localhost:3001/health`
- Open GitHub issue with error details

---

**Built with Socket.IO and Node.js**
