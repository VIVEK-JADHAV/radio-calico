# Docker Deployment Guide

This guide explains how to deploy Radio Calico using Docker for production environments.

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Start the application
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f radiocalico

# Stop the application
docker-compose down
```

### Option 2: Docker CLI

```bash
# Build the image
docker build -t radiocalico:latest .

# Run the container
docker run -d \
  --name radiocalico \
  -p 3000:3000 \
  -v radiocalico-data:/app/database \
  -e NODE_ENV=production \
  --restart unless-stopped \
  radiocalico:latest

# Check container status
docker ps

# View logs
docker logs -f radiocalico

# Stop and remove
docker stop radiocalico
docker rm radiocalico
```

## Container Specifications

### Image Details
- **Base Image**: node:20-alpine
- **Size**: ~150MB (compressed)
- **User**: Non-root (`node` user)
- **Architecture**: Multi-stage build for optimization

### Exposed Ports
- **3000**: HTTP server (configurable via PORT environment variable)

### Volumes
- **/app/database**: SQLite database storage (must be persistent)

### Health Check
- **Endpoint**: http://localhost:3000/api/health
- **Interval**: 30 seconds
- **Timeout**: 3 seconds
- **Start Period**: 10 seconds
- **Retries**: 3

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | HTTP server port |
| `NODE_ENV` | production | Environment mode |
| `DATABASE_PATH` | /app/database/app.db | SQLite database file path |

### Customizing docker-compose.yml

```yaml
services:
  radiocalico:
    environment:
      - PORT=8080  # Change port
      - NODE_ENV=production
    ports:
      - "8080:8080"  # Update port mapping
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

## Database Management

### Backup Database

```bash
# Create backup
docker run --rm \
  -v radiocalico-data:/data \
  -v $(pwd):/backup \
  alpine sh -c "cp /data/app.db /backup/app.db.backup-$(date +%Y%m%d-%H%M%S)"
```

### Restore Database

```bash
# Restore from backup
docker run --rm \
  -v radiocalico-data:/data \
  -v $(pwd):/backup \
  alpine cp /backup/app.db.backup /data/app.db

# Restart container to use restored database
docker-compose restart
```

### Inspect Database

```bash
# Access database with sqlite3
docker run --rm -it \
  -v radiocalico-data:/data \
  alpine sh -c "apk add sqlite && sqlite3 /data/app.db"
```

## Monitoring

### View Logs

```bash
# Follow logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Since timestamp
docker-compose logs --since 2026-01-30T10:00:00
```

### Check Health Status

```bash
# Using docker inspect
docker inspect --format='{{.State.Health.Status}}' radiocalico

# Using curl
curl http://localhost:3000/api/health
```

### Resource Usage

```bash
# Container stats
docker stats radiocalico

# Disk usage
docker system df
```

## Production Deployment

### Reverse Proxy Setup (nginx)

```nginx
server {
    listen 80;
    server_name radio.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Enable HTTPS with Caddy

```caddyfile
radio.example.com {
    reverse_proxy localhost:3000
    header {
        X-Real-IP {remote_host}
        X-Forwarded-For {remote_host}
    }
}
```

### Resource Limits

Add to docker-compose.yml:

```yaml
services:
  radiocalico:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Logging Configuration

```yaml
services:
  radiocalico:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs for errors
docker-compose logs radiocalico

# Inspect container
docker inspect radiocalico

# Verify image built correctly
docker images radiocalico
```

### Database Issues

```bash
# Check database file permissions
docker exec radiocalico ls -la /app/database/

# Verify database initialization
docker exec radiocalico sqlite3 /app/database/app.db ".tables"
```

### Port Conflicts

```bash
# Check if port 3000 is in use
lsof -i :3000

# Use different port
docker-compose down
# Edit docker-compose.yml to change ports
docker-compose up -d
```

### Health Check Failing

```bash
# Test health endpoint manually
docker exec radiocalico wget -q -O- http://localhost:3000/api/health

# Check if Node.js process is running
docker exec radiocalico ps aux
```

## Updating the Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Verify update
docker-compose logs -f
```

## Cleanup

### Remove Container and Image

```bash
# Stop and remove container
docker-compose down

# Remove image
docker rmi radiocalico:latest
```

### Remove Database Volume

**WARNING**: This deletes all data permanently.

```bash
# Remove volume
docker-compose down -v

# Or manually
docker volume rm radiocalico-data
```

### Complete Cleanup

```bash
# Remove everything
docker-compose down -v --rmi all

# Clean up Docker system
docker system prune -a
```

## Security Considerations

1. **Non-root User**: Container runs as `node` user (UID 1000)
2. **Minimal Base Image**: Alpine Linux reduces attack surface
3. **No Exposed Secrets**: Environment variables, not hardcoded credentials
4. **Read-only Filesystem**: Only `/app/database` is writable
5. **Health Monitoring**: Built-in health checks detect issues
6. **Signal Handling**: Proper shutdown with dumb-init

## Performance Tuning

### Memory Optimization

```yaml
services:
  radiocalico:
    environment:
      - NODE_OPTIONS="--max-old-space-size=256"
```

### Multi-container Deployment

For high-traffic scenarios, run multiple instances behind a load balancer:

```yaml
services:
  radiocalico:
    deploy:
      replicas: 3
```

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- GitHub Issues: https://github.com/VIVEK-JADHAV/radio-calico/issues
- Review CLAUDE.md for development details
