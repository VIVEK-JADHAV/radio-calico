# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Radio Calico is a Node.js/Express web application for a live streaming radio service. It features a SQLite database backend for managing users and song ratings, with an IP-based rating system to prevent duplicate votes.

## File Structure

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
├── tests/                      # Test suite (87+ tests)
│   ├── backend/                # Backend API and database tests
│   ├── frontend/               # Frontend utility and parsing tests
│   └── integration/            # End-to-end workflow tests
├── .env                        # Environment configuration
├── package.json                # Node.js dependencies
├── jest.config.js              # Jest test configuration
├── TESTING.md                  # Testing documentation
└── RadioCalico_Style_Guide.txt # Brand and UI design specifications
```

## Development Commands

### Start the server
```bash
npm start&
# or
npm run dev
```
Server runs at http://localhost:3000

### Configuration
Environment variables are stored in `.env`:
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode
- `DATABASE_PATH` - SQLite database file path (default: ./database/app.db)

### Run Tests
```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
npm run test:backend     # Backend tests only
npm run test:frontend    # Frontend tests only
npm run test:integration # Integration tests only
```

Test suite includes 87+ tests covering:
- Backend API endpoints and database operations
- Frontend utility functions and metadata parsing
- Integration tests for complete user workflows
- See TESTING.md for detailed documentation

## Architecture

### Application Structure

**Three-layer architecture:**

1. **Web Server Layer** (`server.js`)
   - Express.js application with CORS enabled
   - Handles routing, middleware, and API endpoints
   - Uses client IP address (from headers or socket) to identify users for rating system
   - Static files served from `public/` directory

2. **Database Layer** (`database/db.js`)
   - SQLite database using better-sqlite3 (synchronous API)
   - Database initialization with schema creation on startup
   - Foreign keys enabled via pragma
   - Exports configured database instance for use in server.js

3. **Frontend Layer** (`public/`)
   - `index.html` - Clean semantic HTML markup for radio streaming interface
   - `styles.css` - All CSS styling following Radio Calico brand guidelines
   - `script.js` - JavaScript for HLS streaming, audio controls, metadata fetching, and rating system
   - `RadioCalicoLogoTM.png` - Brand logo asset
   - Uses HLS.js library for live audio streaming

### Frontend Organization

The frontend follows separation of concerns with three distinct files:

**index.html** - Contains only semantic HTML markup:
- Navigation header with logo
- Audio player element
- Song information display (artist, title, album, year badge)
- Audio controls (play/pause, volume, time display)
- Rating interface (thumbs up/down buttons)
- Recently played tracks section

**styles.css** - All styling rules:
- Responsive grid layout (switches from 2-column to single-column on mobile)
- Brand-compliant colors and typography
- Custom audio control styling
- Media queries for breakpoints at 1200px and 968px

**script.js** - All client-side functionality:
- HLS player initialization and error handling
- Audio playback controls and volume management
- Metadata polling (fetches every 10 seconds from CDN)
- Song rating system with API calls
- Recently played tracks updates
- Creates unique song IDs from artist + title for rating tracking

### Database Schema

**Tables:**
- `users` - Example user management table with email uniqueness
- `song_ratings` - Song rating system with constraints:
  - `rating` must be 1 (thumbs up) or -1 (thumbs down)
  - UNIQUE constraint on (song_id, user_id) prevents duplicate ratings per user
  - Uses client IP as user_id for anonymous rating tracking

### API Endpoints

**Core endpoints:**
- `GET /` - Serves main frontend
- `GET /api/health` - Health check

**User management:**
- `GET /api/users` - List all users
- `POST /api/users` - Create user with {name, email}

**Song rating system:**
- `GET /api/ratings/:songId` - Get thumbs up/down counts for a song
- `GET /api/ratings/:songId/check` - Check if current user (by IP) has rated a song
- `POST /api/ratings` - Submit rating with {songId, rating}
  - Returns 409 if user already rated (UNIQUE constraint)
  - Returns updated counts on success

### Client IP Detection

The `getClientIp()` helper function in server.js extracts client IP addresses in this priority order:
1. `x-forwarded-for` header (first IP if multiple)
2. `x-real-ip` header
3. Socket remote address
4. Connection remote address

This ensures ratings work correctly behind proxies and load balancers.

## Brand Guidelines

Radio Calico has specific design requirements documented in `RadioCalico_Style_Guide.txt`:

**Color Palette:**
- Mint (#D8F2D5) - backgrounds, accents
- Forest Green (#1F4E23) - buttons, headings
- Teal (#38A29D) - navigation, hover states
- Calico Orange (#EFA63C) - call-to-action elements
- Charcoal (#231F20) - body text
- Cream (#F5EADA) - secondary backgrounds

**Typography:**
- Headings: Montserrat (weights 500-700)
- Body: Open Sans (400-600)
- All text should use these fonts with specified fallbacks

**UI Components:**
- Buttons: 4px border-radius, uppercase text, 0.05em letter-spacing
- Primary buttons: Forest Green background, white text
- Hover states: Teal for primary, Mint background for secondary
- Form inputs: 1px border, 4px radius, Teal focus state with 3px shadow

When modifying the frontend, ensure changes align with these brand guidelines.

## Database Modifications

To add new tables:
1. Edit `database/db.js`
2. Add CREATE TABLE statement in `initializeDatabase()` function
3. The database will auto-initialize on next server start
4. Add corresponding API routes in `server.js`

Database uses synchronous better-sqlite3 API:
- Queries: `db.prepare('SELECT...').all()` or `.get()`
- Inserts: `db.prepare('INSERT...').run()`
- Access lastInsertRowid from result object
