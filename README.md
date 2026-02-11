# WebChat Backend Server — The Engine 🔧

The backend is the brain behind WebChat. It powers real-time messaging, video calls, and keeps track of who's online. Built with Node.js, it's fast, scalable, and handles thousands of users at once.

This is the code that runs on the server (not in your browser). The frontend talks to it whenever something needs to happen in real-time.

> **Note:** I built this as part of my first major project. It's solid, but there's room to optimize further.

## ✨ What This Server Does

- **💬 Never Stores Messages** — Messages go straight from User A's browser to User B's browser via WebSockets. If B is offline, the frontend app handles saving them to the database.
- **👥 Tracks Who's Online** — When you log in, the server knows you're here. When you close the tab, it knows you're gone (thanks to `navigator.sendBeacon`).
- **📝 Typing Indicators** — "User is typing..." message appears instantly through the server
- **📞 Call Setup** — When you want to call someone, the server helps exchange the initial connection info. After that, video goes directly between you (P2P)
- **⚡ Super Fast** — The server just forwards data. It doesn't do heavy processing.

## 🛠️ Tech Stack (And Why)

- **Node.js** — JavaScript on the server. Familiar language, great for real-time stuff.
- **Express.js** — Lightweight web framework. Handles HTTP requests and routes.
- **Socket.IO** — Real-time communication library. Keeps a persistent connection open to each user's browser.
- **Helmet** — Adds security headers so browsers block common attacks.
- **CORS** — Makes sure only your frontend can talk to this server.

## 🚀 Getting Started

### What You Need

- **Node.js** — [Download here](https://nodejs.org/) (Get version 18+)
- **Git** — [Download here](https://git-scm.com/)

### Step 1: Clone & Install

```bash
git clone https://github.com/chahinsellami/webchat-backend.git
cd webchat-backend
npm install
```

### Step 2: Set Up Environment

Create a `.env` file in the root folder:

```env
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

> **PORT=3001** — The server listens on this port. If you change it, update `NEXT_PUBLIC_SOCKET_URL` in the frontend!

### Step 3: Run It

```bash
npm start
```

You should see:
```
Server running on port 3001
Socket.IO server listening...
```

### Step 4: Check It's Working

Visit **http://localhost:3001/health** in your browser. You should see:

```json
{
  "status": "ok",
  "service": "WebChat Socket.IO Server",
  "activeUsers": 0,
  "timestamp": "2024-01-28T10:30:00.000Z"
}
```

If you see this, the server is alive! 🎉

## � How It Works: Socket.IO Events

When the frontend connects, it sends and receives messages through special events. Think of it like sending envelopes through the server—the server reads the address and delivers it.

### Frontend → Server (Client Sends)

When your browser does something, it tells the server:

| Event          | What it means                           | Example                                    |
|----------------|----------------------------------------|--------------------------------------------|
| `join`         | "I just logged in"                     | `{userId: "123"}`                          |
| `send-message` | "Send this message to someone"         | `{to: "456", text: "Hey!"}`                |
| `typing`       | "I'm typing a message"                 | `{to: "456", isTyping: true}`              |
| `call-user`    | "I want to call this person"           | `{to: "456", signal: {...}}`               |
| `accept-call`  | "I accept the call"                    | `{to: "456", signal: {...}}`               |
| `end-call`     | "Hang up"                              | `{to: "456"}`                              |

### Server → Frontend (Server Sends)

The server broadcasts these events to clients:

| Event          | What it means                           |
|----------------|----------------------------------------|
| `user-online`  | "Someone just logged in"               |
| `user-offline` | "Someone just logged out"              |
| `receive-message` | "You got a message"                |
| `user-typing`  | "Someone is typing to you"             |
| `incoming-call` | "Someone is calling you"              |
| `call-accepted` | "They accepted your call"             |
| `call-rejected` | "They rejected your call"             |

## 🏗️ The Real-Time Flow

### How Messaging Works

```
User A types "Hi"
        ↓
Frontend emits "send-message"
        ↓
Server receives it
        ↓
Server finds User B's socket
        ↓
Server emits "receive-message" to User B
        ↓
User B's browser shows "Hi"
        ↓
All happens in < 100 milliseconds! ⚡
```

### How Video Calls Work

```
User A clicks "Call User B"
        ↓
User A's browser creates a "call offer"
        ↓
Frontend emits "call-user" with the offer
        ↓
Server finds User B and forwards with "incoming-call"
        ↓
User B sees incoming call popup
        ↓
User B clicks Accept
        ↓
User B's browser creates a "call answer"
        ↓
Frontend emits "accept-call" with the answer
        ↓
Server forwards answer back to User A
        ↓
Browsers exchange more data (ICE candidates)
        ↓
Video/audio connection established directly between them
        ↓
(Server gets out of the way—no video goes through it!)
```

## 📂 Project Structure

```
backend-server/
├── server.js              # Main server code (handles everything)
├── package.json           # Dependencies list
├── .env                   # Your secret config (create this)
└── tests/                 # Tests (if you want to add them)
    ├── unit/              # Test individual functions
    └── integration/       # Test real Socket.IO events
```

**The important file:** `server.js` — This is where all the Socket.IO magic happens.

## 🔒 Security Features

- **CORS** — Only YOUR frontend can talk to this server
- **Helmet** — Protects against common web attacks
- **Rate Limiting** — Stops spammers from flooding the server
- **No Auth** — Auth is handled by the frontend (user logs in with JWT token, not sent to server)
- **No Password Storage** — Passwords are hashed and stored in the database, not here

## 🚀 Deploy to the Cloud

### Option 1: Railway (Recommended)

1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project" → "Deploy from GitHub"
3. Select your backend repository
4. Railway will automatically:
   - Install dependencies (`npm install`)
   - Run the server (`npm start`)
   - Keep it running 24/7
5. Go to your project settings and add environment variables:
   - `PORT` = `3001`
   - `FRONTEND_URL` = `https://your-vercel-url.vercel.app`
6. Done! Your server is live.

### Option 2: Heroku (Also Works)

Same as Railway, but go to [heroku.com](https://heroku.com) instead.

### Option 3: Render

1. Go to [render.com](https://render.com)
2. Create "New Web Service"
3. Connect your GitHub repo
4. Set environment variables
5. Deploy

**Important:** After deploying, update your frontend's `.env.local`:

```env
NEXT_PUBLIC_SOCKET_URL=https://your-backend-on-railway.com
```

Replace with your actual Railway/Heroku/Render URL.

## 💻 Development Tips

### Watch for Changes

Instead of restarting manually:

```bash
npm run dev
```

This watches your files and restarts the server when you change something.

### See What's Happening

The server logs every event. When a Socket.IO event comes in, you'll see:

```
[Socket.IO] join event - userId: 123
[Socket.IO] send-message event - from 123 to 456
```

This helps debug if something isn't working.

### Test Locally

To test with the frontend:

1. **Terminal 1:** Backend `npm start` (running on 3001)
2. **Terminal 2:** Frontend `npm run dev` (running on 3000)
3. Open browser to http://localhost:3000
4. Watch server logs as you use the app

## 🐛 Troubleshooting

### "Port 3001 is already in use"

Another process is using that port. Kill it:

**Windows (PowerShell):**
```powershell
Get-Process node | Stop-Process -Force
```

**Mac/Linux:**
```bash
lsof -i :3001 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### "Cannot connect to server from frontend"

**Check these:**

1. Is the backend running? (see `Server running on port 3001`)
2. Is `NEXT_PUBLIC_SOCKET_URL` correct in frontend `.env.local`?
3. Are both on same network (both local, or both on internet)?
4. Is firewall blocking port 3001?

**Test manually:**
```bash
curl http://localhost:3001/health
```

Should return the health JSON.

### "Messages not sending"

Check browser console for errors. Common causes:
- Frontend URL wrong in `.env`
- Browser security (add to CORS if needed)
- Socket disconnected (check `user-online` events in server logs)

### "Video call not working but messaging is"

Messaging uses this server. Video calling setup uses this server, but the actual video/audio goes P2P. If messaging works but video doesn't:

1. Check Agora.io is configured (this is frontend issue, not server)
2. Browser permissions might be blocking camera
3. Not both users' permission issues

## 📊 Understanding the Logs

When the server is running, you'll see helpful messages:

```
Server running on port 3001
Socket.IO server listening...

[Connection] User 123 joined
[Connection] Active users: 1

[Message] 123 → 456: "Hello!"
[Typing] 123 → 456

[Disconnection] User 123 left
```

These logs help you understand what's happening in real-time.

## 🎓 Learning Resources

Since this is a real Node.js server, understanding these concepts helps:

- **Socket.IO Guide:** [socket.io/docs](https://socket.io/docs/)
- **Express Basics:** [expressjs.com](https://expressjs.com/)
- **Node.js Docs:** [nodejs.org/docs](https://nodejs.org/docs/)
- **WebSockets:** [MDN WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

## 🤝 Want to Improve This?

Ideas for next features:
- **Message History** — Store old messages in database
- **User Profiles** — Pull user info from database instead of just IDs
- **Rate Limiting** — Stop spammers
- **Logging** — Save activity for debugging
- **Tests** — Make sure everything still works when you change things

---

**Built with ❤️ by a junior developer learning backend architecture.**

**Links:**
- **Backend Repo:** [github.com/chahinsellami/webchat-backend](https://github.com/chahinsellami/webchat-backend)
- **Frontend Repo:** [github.com/chahinsellami/chatapp](https://github.com/chahinsellami/chatapp)
- **Questions?** Open an issue or reach out on LinkedIn!
