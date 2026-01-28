# Docker Deployment Guide

## Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed
- Docker daemon running

## Running Locally on Your PC

### Option 1: Using Docker Compose (Recommended)

```bash
# Navigate to backend directory
cd backend-server

# Build and start the container
docker-compose up --build

# The server will be available at http://localhost:3001
# View logs: docker-compose logs -f
```

### Option 2: Manual Docker Commands

```bash
# Build the Docker image
docker build -t webchat-backend:latest .

# Run the container
docker run -p 3001:3001 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e FRONTEND_URL=http://localhost:3000 \
  --name webchat-backend \
  webchat-backend:latest
```

## Connecting Frontend to Backend

### For Local Development
Update your frontend environment variables:
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### For Production (Frontend on Vercel)
Update environment variables to:
```env
NEXT_PUBLIC_SOCKET_URL=http://your-pc-ip:3001
# Example: http://192.168.1.100:3001
```

Find your PC IP address:
```bash
# Windows
ipconfig

# Linux/Mac
ifconfig
```

## Docker Commands

### View running containers
```bash
docker ps
```

### View logs
```bash
docker-compose logs -f webchat-backend
```

### Stop the container
```bash
docker-compose down
```

### Rebuild after code changes
```bash
docker-compose up --build
```

### Remove the image
```bash
docker rmi webchat-backend:latest
```

## Verify Server is Running

```bash
# Check health endpoint
curl http://localhost:3001/health

# Expected response:
# {
#   "status": "ok",
#   "service": "WebChat Socket.IO Server",
#   "activeUsers": 0,
#   "timestamp": "2026-01-24T...",
#   "uptime": 123.456,
#   "memory": {...}
# }
```

## Troubleshooting

### Port 3001 already in use
```bash
# Find process using port 3001
netstat -ano | findstr :3001

# Kill the process (Windows)
taskkill /PID <PID> /F

# Or use a different port in docker-compose.yml
ports:
  - "3002:3001"
```

### Container won't start
```bash
# Check logs
docker-compose logs

# Rebuild without cache
docker-compose up --build --no-cache
```

### Cannot connect from frontend
- Ensure Docker container is running: `docker ps`
- Check firewall allows port 3001
- Verify CORS settings in server.js
- Use your PC's IP address, not localhost from Vercel

## Deploying to Cloud (Later)

When you're ready to deploy the Docker container to production:

### AWS EC2
1. Push image to ECR (Elastic Container Registry)
2. Create EC2 instance with Docker installed
3. Pull and run the image

### DigitalOcean
1. Push image to Docker Hub
2. Create Droplet with Docker
3. Pull and run the image

### Google Cloud Run
```bash
gcloud run deploy webchat-backend --source .
```

### Azure Container Instances
```bash
az container create --resource-group myGroup --name webchat-backend \
  --image webchat-backend:latest --ports 3001
```

## Security Notes

1. **Update FRONTEND_URL**: Change to your actual Vercel URL in production
2. **Use Environment Variables**: Don't hardcode sensitive data
3. **Enable HTTPS**: Use reverse proxy (Nginx) with SSL in production
4. **Rate Limiting**: Already implemented in server.js
5. **Update base image**: Regularly pull latest Node.js Alpine image

## Next Steps

1. Test locally with Docker
2. Update frontend's NEXT_PUBLIC_SOCKET_URL
3. Deploy to cloud service when ready
4. Set up automated rebuilds on code changes
