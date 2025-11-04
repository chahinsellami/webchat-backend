# WebChat Backend Server

Socket.IO and WebRTC signaling server for WebChat application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update environment variables in `.env`

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Deployment to Railway

1. Push this folder to a GitHub repository
2. Connect the repo to Railway
3. Set environment variables in Railway dashboard:
   - `PORT` (Railway will auto-assign)
   - `FRONTEND_URL` (your Vercel frontend URL)
4. Deploy!

## Environment Variables

- `PORT`: Server port (default: 3001)
- `FRONTEND_URL`: Frontend application URL for CORS

## Endpoints

- `GET /` or `GET /health`: Health check endpoint
- WebSocket: Socket.IO connection on same port

## Events

### Client to Server:
- `join`: User joins with userId
- `send-message`: Send a direct message
- `typing`: Typing indicator
- `call-user`: Initiate WebRTC call
- `accept-call`: Accept incoming call
- `reject-call`: Reject incoming call
- `end-call`: End active call
- `ice-candidate`: WebRTC ICE candidate exchange

### Server to Client:
- `receive-message`: Receive a direct message
- `user-typing`: Receive typing indicator
- `incoming-call`: Receive call notification
- `call-accepted`: Call was accepted
- `call-rejected`: Call was rejected
- `call-ended`: Call was ended
- `ice-candidate`: WebRTC ICE candidate
- `user-online`: User came online
- `user-offline`: User went offline
