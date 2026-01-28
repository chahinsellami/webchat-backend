# Frontend Setup Guide - WebChat

This guide shows how to configure your Vercel frontend to connect to your local Docker backend.

## Your Configuration

- **Backend Server**: http://192.168.100.12:3001
- **Local IP**: 192.168.100.12
- **Vercel URL**: https://chatapp-two-drab.vercel.app

## Setup Instructions

### Option 1: Local Development (Recommended)

For testing locally with frontend also running on your PC:

**File**: `webchat-app/.env.local`

```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Auth
JWT_SECRET=your_secret_key_here

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Socket.IO - Your local backend
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

# Agora (if using)
NEXT_PUBLIC_AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_certificate

# Environment
NODE_ENV=development
```

**Start frontend**:
```bash
cd webchat-app
npm run dev
```

Access at: `http://localhost:3000`

---

### Option 2: Vercel Frontend + Local Docker Backend

For testing Vercel frontend connected to your local backend:

**In Vercel Dashboard**:

1. Go to Settings → Environment Variables
2. Add or update these variables:

```
NEXT_PUBLIC_SOCKET_URL=http://192.168.100.12:3001
```

**Other variables** (keep existing):
```
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_value
CLOUDINARY_API_KEY=your_value
CLOUDINARY_API_SECRET=your_value
NEXT_PUBLIC_AGORA_APP_ID=your_value
AGORA_APP_CERTIFICATE=your_value
NODE_ENV=production
```

After deployment, your Vercel app will connect to:
- **API calls**: Your PostgreSQL database (Railway or other)
- **Real-time**: Your local backend at `http://192.168.100.12:3001`

Access at: `https://chatapp-two-drab.vercel.app`

---

### Option 3: Full Production (Future)

When you deploy backend to cloud:

```
NEXT_PUBLIC_SOCKET_URL=https://your-backend-domain.com
```

---

## Testing Connectivity

### Test 1: Health Check

```bash
# From your PC
curl http://localhost:3001/health

# From Vercel frontend, check browser console
fetch('http://192.168.100.12:3001/health')
  .then(r => r.json())
  .then(d => console.log(d))
```

### Test 2: Socket.IO Connection

Open browser DevTools → Network → WS, and you should see:
- `/socket.io/?...` WebSocket connection to your backend

### Test 3: Real-Time Messaging

1. Sign up two accounts
2. Send a direct message
3. Should appear instantly (Socket.IO)
4. Should persist in database (API)

---

## Troubleshooting

### Connection Refused
- ✅ Check Docker is running: `docker ps`
- ✅ Check backend is healthy: `curl http://localhost:3001/health`
- ✅ Check firewall allows port 3001

### CORS Error
- ✅ Verify your IP is in `server.js` allowedOrigins (192.168.100.12)
- ✅ Check `NEXT_PUBLIC_SOCKET_URL` matches your IP
- ✅ Restart Docker container

### WebSocket Connection Fails
- ✅ Check `NEXT_PUBLIC_SOCKET_URL` is exactly correct
- ✅ Try from localhost first to isolate issue
- ✅ Check network firewall allows WebSocket

---

## Quick Commands

```bash
# Check your PC IP
ipconfig

# Test backend health
curl http://192.168.100.12:3001/health

# View Docker logs
docker logs -f webchat-backend

# Stop backend
docker stop webchat-backend

# Start backend
docker start webchat-backend
```

---

## Next Steps

1. ✅ Update `.env.local` with `NEXT_PUBLIC_SOCKET_URL=http://localhost:3001`
2. ✅ Run frontend: `npm run dev`
3. ✅ Test features locally
4. ✅ Deploy to Vercel when ready
5. ✅ Update Vercel env vars with your IP: `http://192.168.100.12:3001`
6. ✅ Test Vercel connection

**You're all set!** 🚀
