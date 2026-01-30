# Radio Calico

A live streaming radio web application with real-time metadata display, song ratings, and a clean, responsive interface. Built with Node.js, Express, SQLite, and HLS streaming.

## Features

- **Live HLS Audio Streaming** - High-quality audio streaming with HLS.js
- **Real-time Metadata** - Displays current song, artist, album, and album artwork
- **Song Rating System** - Users can rate songs with thumbs up/down (IP-based to prevent duplicates)
- **Recently Played Tracks** - Shows the last 5 songs played
- **Responsive Design** - Mobile-friendly interface following Radio Calico brand guidelines
- **Persistent Storage** - SQLite database for user management and song ratings

## Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: SQLite (better-sqlite3)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Streaming**: HLS.js for adaptive bitrate streaming
- **Utilities**: CORS, dotenv

## Project Structure

```
radiocalico/
├── server.js                    # Express server and API routes
├── database/
│   ├── db.js                   # SQLite database initialization
│   └── app.db                  # SQLite database file (created on first run)
├── public/
│   ├── index.html              # Main HTML markup
│   ├── styles.css              # All CSS styling
│   ├── script.js               # Frontend JavaScript (HLS player, ratings)
│   └── RadioCalicoLogoTM.png   # Brand logo
├── .env                        # Environment configuration
├── package.json                # Node.js dependencies
├── CLAUDE.md                   # Development guide for AI assistants
└── RadioCalico_Style_Guide.txt # Brand and UI design specifications
```

## Quick Start

### Install Dependencies
```bash
npm install
```

### Configure Environment
Create a `.env` file with:
```
PORT=3000
NODE_ENV=development
DATABASE_PATH=./database/app.db
```

### Start the Server
```bash
npm start
```

The server will run at: http://localhost:3000

## Docker Deployment

Radio Calico can be deployed in a self-contained Docker container for production environments.

### Prerequisites
- Docker 20.10+ and Docker Compose 2.0+
- 100MB disk space for image and database

### Quick Start with Docker Compose

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down

# Stop and remove database volume
docker-compose down -v
```

The application will be available at http://localhost:3000

### Build Docker Image Manually

```bash
# Build the image
docker build -t radiocalico:latest .

# Run the container
docker run -d \
  --name radiocalico \
  -p 3000:3000 \
  -v radiocalico-data:/app/database \
  -e NODE_ENV=production \
  radiocalico:latest

# View logs
docker logs -f radiocalico

# Stop and remove container
docker stop radiocalico && docker rm radiocalico
```

### Docker Features

- **Multi-stage Build** - Optimized image size (~150MB)
- **Non-root User** - Runs as `node` user for security
- **Health Checks** - Built-in health monitoring using `/api/health`
- **Persistent Storage** - SQLite database stored in Docker volume
- **Signal Handling** - Proper shutdown with dumb-init
- **Alpine Linux** - Minimal attack surface

### Environment Variables

Configure via `docker-compose.yml` or `-e` flags:

```yaml
environment:
  - PORT=3000
  - NODE_ENV=production
  - DATABASE_PATH=/app/database/app.db
```

### Database Persistence

The SQLite database is stored in a Docker volume (`radiocalico-data`). To backup:

```bash
# Backup database
docker run --rm \
  -v radiocalico-data:/data \
  -v $(pwd):/backup \
  alpine cp /data/app.db /backup/app.db.backup

# Restore database
docker run --rm \
  -v radiocalico-data:/data \
  -v $(pwd):/backup \
  alpine cp /backup/app.db.backup /data/app.db
```

### Production Deployment

For production deployments:

1. **Use a Reverse Proxy** (nginx/Caddy) for HTTPS
2. **Set Resource Limits** in docker-compose.yml:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1'
         memory: 512M
   ```
3. **Enable Logging** with a log driver:
   ```yaml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```
4. **Monitor Health** using the built-in health check endpoint

## API Endpoints

### Core Endpoints
- `GET /` - Main web interface
- `GET /api/health` - Health check

### User Management
- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com"
  }
  ```

### Song Rating System
- `GET /api/ratings/:songId` - Get rating counts for a song
  ```json
  {
    "songId": "artistname||songtitle",
    "thumbsUp": 10,
    "thumbsDown": 2
  }
  ```

- `GET /api/ratings/:songId/check` - Check if current user has rated a song
  ```json
  {
    "hasRated": true,
    "rating": 1
  }
  ```

- `POST /api/ratings` - Submit a rating
  ```json
  {
    "songId": "artistname||songtitle",
    "rating": 1
  }
  ```
  - `rating`: 1 for thumbs up, -1 for thumbs down
  - Returns 409 if user already rated this song

## Database Schema

### users
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### song_ratings
```sql
CREATE TABLE song_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  song_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating IN (1, -1)),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(song_id, user_id)
)
```

## Frontend Features

### HLS Audio Player
- Automatic HLS initialization with fallback for Safari
- Play/pause controls with visual feedback
- Volume control with dynamic icon updates
- Elapsed time display for live stream
- Error recovery for network and media issues

### Metadata Display
- Real-time song information (artist, title, album)
- Dynamic album artwork with cache busting
- Year badge extracted from album date
- Updates every 10 seconds from CDN

### Rating System
- Thumbs up/down buttons
- Real-time vote counts
- IP-based duplicate prevention
- Visual feedback for user's vote
- Error handling and user messages

### Responsive Design
- 2-column grid layout on desktop (500px album art + info)
- Single-column layout on mobile (< 968px)
- Touch-friendly button sizes (44px minimum)
- Adaptive typography and spacing

## Brand Guidelines

Radio Calico follows a specific design system:

**Colors:**
- Mint (#D8F2D5) - backgrounds, accents
- Forest Green (#1F4E23) - buttons, headings
- Teal (#38A29D) - navigation, hover states
- Calico Orange (#EFA63C) - call-to-action elements
- Charcoal (#231F20) - body text
- Cream (#F5EADA) - secondary backgrounds

**Typography:**
- Headings: Montserrat (500-700 weight)
- Body: Open Sans (400-600 weight)

See `RadioCalico_Style_Guide.txt` for complete design specifications.

## Development

### Adding New Database Tables
1. Edit `database/db.js`
2. Add CREATE TABLE statement in `initializeDatabase()`
3. Restart the server (database auto-initializes)
4. Add corresponding API routes in `server.js`

### Modifying Frontend
- **HTML**: Edit `public/index.html`
- **CSS**: Edit `public/styles.css` (follow brand guidelines)
- **JavaScript**: Edit `public/script.js`

### IP-Based User Identification
The rating system uses client IP addresses for anonymous user tracking:
1. `x-forwarded-for` header (first IP if multiple)
2. `x-real-ip` header
3. Socket remote address
4. Connection remote address

This works correctly behind proxies and load balancers.

## Testing

Radio Calico includes a comprehensive test suite with 87+ tests covering backend, frontend, and integration scenarios.

### Run Tests
```bash
# All tests
npm test

# Watch mode
npm run test:watch

# With coverage report
npm run test:coverage

# Specific test suites
npm run test:backend
npm run test:frontend
npm run test:integration
```

### Test Coverage
- **Backend**: API endpoints, database constraints, rating logic, IP detection
- **Frontend**: Utility functions, metadata parsing, quality formatting
- **Integration**: Complete user workflows and rating flows

See [TESTING.md](TESTING.md) for detailed testing documentation.

## Security

Radio Calico includes security scanning and auditing tools to ensure the application is free from known vulnerabilities.

### Security Audits

```bash
# Run full security check (audit + tests)
npm run security

# Check for known vulnerabilities
npm audit

# Check production dependencies only
npm run audit:production

# Attempt to automatically fix vulnerabilities
npm run audit:fix
```

### Using Make Targets

A Makefile is provided for common development and security tasks:

```bash
# Show all available commands
make help

# Run security audit and tests
make security

# Run npm audit only
make audit

# Attempt to fix vulnerabilities
make audit-fix

# Run all tests
make test

# Run tests with coverage
make test-coverage
```

### CI/CD Security Checks

The GitHub Actions workflow automatically:
- Runs `npm audit` on all pull requests and commits to main
- Fails builds if high or critical vulnerabilities are found
- Runs the full test suite before building Docker images
- Scans Docker images with Trivy for container vulnerabilities

### Security Best Practices

1. **Regular Updates**: Run `npm audit fix` regularly to patch vulnerabilities
2. **Production Audits**: Use `npm audit --production` to check runtime dependencies
3. **Pre-commit Checks**: Run `make security` before committing code
4. **Monitor CI/CD**: Check GitHub Actions for security alerts
5. **Review Dependencies**: Audit new dependencies before adding them

## License

ISC

## Repository

https://github.com/VIVEK-JADHAV/radio-calico
