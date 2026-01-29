const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Helper function to get client IP address
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.socket.remoteAddress ||
         req.connection.remoteAddress;
}

// Import database
const db = require('./database/db');

// Basic route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API route example
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Example API route using database
app.get('/api/users', (req, res) => {
  try {
    const users = db.prepare('SELECT * FROM users').all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', (req, res) => {
  try {
    const { name, email } = req.body;
    const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
    const result = stmt.run(name, email);
    res.status(201).json({ id: result.lastInsertRowid, name, email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get ratings for a song
app.get('/api/ratings/:songId', (req, res) => {
  try {
    const { songId } = req.params;
    const thumbsUp = db.prepare('SELECT COUNT(*) as count FROM song_ratings WHERE song_id = ? AND rating = 1').get(songId);
    const thumbsDown = db.prepare('SELECT COUNT(*) as count FROM song_ratings WHERE song_id = ? AND rating = -1').get(songId);

    res.json({
      songId,
      thumbsUp: thumbsUp.count,
      thumbsDown: thumbsDown.count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if user has rated a song
app.get('/api/ratings/:songId/check', (req, res) => {
  try {
    const { songId } = req.params;
    const clientIp = getClientIp(req);

    const result = db.prepare('SELECT rating FROM song_ratings WHERE song_id = ? AND user_id = ?').get(songId, clientIp);

    res.json({
      hasRated: !!result,
      rating: result ? result.rating : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit a rating for a song
app.post('/api/ratings', (req, res) => {
  try {
    const { songId, rating } = req.body;
    const clientIp = getClientIp(req);

    if (!songId || !rating) {
      return res.status(400).json({ error: 'Missing required fields: songId, rating' });
    }

    if (rating !== 1 && rating !== -1) {
      return res.status(400).json({ error: 'Rating must be 1 (thumbs up) or -1 (thumbs down)' });
    }

    // Try to insert the rating
    const stmt = db.prepare('INSERT INTO song_ratings (song_id, user_id, rating) VALUES (?, ?, ?)');

    try {
      stmt.run(songId, clientIp, rating);

      // Get updated counts
      const thumbsUp = db.prepare('SELECT COUNT(*) as count FROM song_ratings WHERE song_id = ? AND rating = 1').get(songId);
      const thumbsDown = db.prepare('SELECT COUNT(*) as count FROM song_ratings WHERE song_id = ? AND rating = -1').get(songId);

      res.status(201).json({
        success: true,
        songId,
        thumbsUp: thumbsUp.count,
        thumbsDown: thumbsDown.count
      });
    } catch (insertError) {
      if (insertError.message.includes('UNIQUE constraint failed')) {
        res.status(409).json({ error: 'You have already rated this song' });
      } else {
        throw insertError;
      }
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
});
