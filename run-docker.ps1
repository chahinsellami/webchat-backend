# WebChat Backend Docker Helper Script
# This script makes it easy to manage your Docker container

param(
    [string]$action = "start",
    [string]$env = "local"
)

$imageName = "webchat-backend:latest"
$containerName = "webchat-backend"

# Configuration
$localConfig = @{
    PORT = "3001"
    NODE_ENV = "production"
    FRONTEND_URL = "http://localhost:3000"
}

$prodConfig = @{
    PORT = "3001"
    NODE_ENV = "production"
    FRONTEND_URL = "https://chatapp-two-drab.vercel.app"
}

function Build-Image {
    Write-Host "🔨 Building Docker image..." -ForegroundColor Cyan
    docker build -t $imageName .
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Image built successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Build failed!" -ForegroundColor Red
    }
}

function Start-Container {
    param([hashtable]$config)
    
    Write-Host "🚀 Starting container..." -ForegroundColor Cyan
    
    # Stop existing container
    docker stop $containerName 2>$null
    docker rm $containerName 2>$null
    
    # Build environment variables
    $envArgs = @(
        "-e", "NODE_ENV=$($config.NODE_ENV)"
        "-e", "PORT=$($config.PORT)"
        "-e", "FRONTEND_URL=$($config.FRONTEND_URL)"
    )
    
    # Run container
    docker run -d -p 3001:3001 @envArgs --name $containerName $imageName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Container started successfully!" -ForegroundColor Green
        Write-Host "📡 Backend running at http://localhost:3001" -ForegroundColor Yellow
        Write-Host "🌐 Connected to: $($config.FRONTEND_URL)" -ForegroundColor Yellow
        
        # Wait and show health status
        Start-Sleep -Seconds 2
        $health = docker inspect -f '{{.State.Health.Status}}' $containerName 2>$null
        Write-Host "💚 Health Status: $health" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to start container!" -ForegroundColor Red
    }
}

function Stop-Container {
    Write-Host "⏹️  Stopping container..." -ForegroundColor Yellow
    docker stop $containerName
    Write-Host "✅ Container stopped" -ForegroundColor Green
}

function Remove-Container {
    Write-Host "🗑️  Removing container..." -ForegroundColor Yellow
    docker stop $containerName 2>$null
    docker rm $containerName 2>$null
    Write-Host "✅ Container removed" -ForegroundColor Green
}

function Show-Logs {
    Write-Host "📋 Container Logs:" -ForegroundColor Cyan
    docker logs -f $containerName
}

function Show-Status {
    Write-Host "📊 Container Status:" -ForegroundColor Cyan
    docker ps | findstr $containerName
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Container not running" -ForegroundColor Yellow
    }
}

function Show-Help {
    Write-Host @"
WebChat Backend Docker Helper

Usage: .\run-docker.ps1 [action] [environment]

Actions:
  build      - Build the Docker image
  start      - Build and start the container
  stop       - Stop the running container
  restart    - Stop and start the container
  remove     - Remove the container
  logs       - Show container logs
  status     - Show container status
  help       - Show this help message

Environments:
  local      - Local development (default)
  prod       - Production (Vercel)

Examples:
  .\run-docker.ps1 start local
  .\run-docker.ps1 start prod
  .\run-docker.ps1 logs
  .\run-docker.ps1 stop

"@
}

# Main logic
$config = if ($env -eq "prod") { $prodConfig } else { $localConfig }

switch ($action.ToLower()) {
    "build" { Build-Image }
    "start" { Build-Image; Start-Container $config }
    "stop" { Stop-Container }
    "restart" { Stop-Container; Start-Sleep -Seconds 1; Start-Container $config }
    "remove" { Remove-Container }
    "logs" { Show-Logs }
    "status" { Show-Status }
    "help" { Show-Help }
    default { Show-Help }
}
