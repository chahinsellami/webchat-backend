# WebChat Backend - Quick Start Guide

## 🎯 Your Setup

- **Local Backend IP**: `192.168.100.12:3001`
- **Vercel Frontend**: `https://chatapp-two-drab.vercel.app`
- **Docker Status**: ✅ Running

---

## 🚀 Quick Commands

### Start Backend
```bash
cd backend-server
.\run-docker.ps1 start local
```

### Stop Backend
```bash
.\run-docker.ps1 stop
```

### View Logs
```bash
.\run-docker.ps1 logs
```

### Check Status
```bash
.\run-docker.ps1 status
```

### For Production (Vercel)
```bash
.\run-docker.ps1 start prod
```

---

## 📱 Frontend Configuration

### Local Development (.env.local)
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### Vercel Environment Variables
```env
NEXT_PUBLIC_SOCKET_URL=http://192.168.100.12:3001
```

Update in Vercel Dashboard → Settings → Environment Variables

---

## ✅ Test Your Setup

### 1. Check Backend Health
```bash
curl http://localhost:3001/health
```

### 2. Run Frontend Locally
```bash
cd webchat-app
npm run dev
```

### 3. Test Features
- ✅ Sign up/login
- ✅ Send direct messages
- ✅ See typing indicators
- ✅ See online status
- ✅ Make voice/video calls
- ✅ Upload images

---

## 🔧 Configuration Files

Updated files:
- ✅ `server.js` - CORS origins
- ✅ `.env.docker` - Environment variables
- ✅ `docker-compose.yml` - Docker setup
- ✅ `run-docker.ps1` - Helper script
- ✅ `FRONTEND_SETUP.md` - Frontend guide

---

## 📊 Architecture

```
┌─────────────────────────────────────────┐
│   Vercel Frontend                       │
│   chatapp-two-drab.vercel.app          │
└──────────────────┬──────────────────────┘
                   │
                   │ WebSocket
                   ↓
┌─────────────────────────────────────────┐
│   Local Docker Backend                  │
│   192.168.100.12:3001                  │
│   - Socket.IO (Real-time)              │
│   - WebRTC Signaling                   │
│   - Agora Call Routing                 │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┼──────────┐
        ↓          ↓          ↓
    ┌────────┐ ┌─────────┐ ┌────────┐
    │PostgreS │ │Cloudinary│ │Agora   │
    │Database │ │(Images)  │ │(Calls) │
    └────────┘ └─────────┘ └────────┘
```

---

## 🛠️ Troubleshooting

### Backend won't start
```bash
docker logs webchat-backend
```

### CORS errors
- Check `NEXT_PUBLIC_SOCKET_URL` is correct
- Verify IP `192.168.100.12` in `server.js`
- Restart container: `.\run-docker.ps1 restart local`

### Can't connect from Vercel
- Verify `NEXT_PUBLIC_SOCKET_URL=http://192.168.100.12:3001` in Vercel env vars
- Check firewall allows port 3001
- Ensure Docker is running

---

## 📚 Files Reference

| File | Purpose |
|------|---------|
| `server.js` | Backend server code |
| `Dockerfile` | Docker image config |
| `docker-compose.yml` | Docker Compose setup |
| `run-docker.ps1` | PowerShell helper script |
| `.env.docker` | Docker environment vars |
| `FRONTEND_SETUP.md` | Frontend configuration guide |
| `DOCKER_DEPLOYMENT.md` | Detailed deployment guide |

---

## 📝 Next Steps

1. ✅ Update frontend `.env.local` with `NEXT_PUBLIC_SOCKET_URL`
2. ✅ Run frontend: `npm run dev`
3. ✅ Test all features locally
4. ✅ Update Vercel environment variables
5. ✅ Deploy Vercel and test
6. ✅ (Optional) Deploy backend to cloud for production

---

**Everything is configured and ready! Happy coding! 🎉**
