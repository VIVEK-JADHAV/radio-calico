const request = require('supertest');
const express = require('express');
const Database = require('better-sqlite3');

// Helper function to get client IP
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.socket.remoteAddress ||
         req.connection.remoteAddress;
}

// Create test server with ratings API
function createTestServer() {
  const app = express();
  const db = new Database(':memory:');

  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS song_ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      song_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating IN (1, -1)),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(song_id, user_id)
    )
  `);

  app.use(express.json());

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

  // Submit a rating
  app.post('/api/ratings', (req, res) => {
    try {
      const { songId, rating } = req.body;
      const clientIp = getClientIp(req);

      if (!songId || rating === undefined || rating === null) {
        return res.status(400).json({ error: 'Missing required fields: songId, rating' });
      }

      if (rating !== 1 && rating !== -1) {
        return res.status(400).json({ error: 'Rating must be 1 (thumbs up) or -1 (thumbs down)' });
      }

      const stmt = db.prepare('INSERT INTO song_ratings (song_id, user_id, rating) VALUES (?, ?, ?)');

      try {
        stmt.run(songId, clientIp, rating);

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

  // Store db for cleanup
  app.locals.db = db;

  return app;
}

describe('Ratings API', () => {
  let app;

  beforeEach(() => {
    app = createTestServer();
  });

  afterEach(() => {
    if (app.locals.db) {
      app.locals.db.close();
    }
  });

  describe('GET /api/ratings/:songId', () => {
    test('should return rating counts for a song', async () => {
      const response = await request(app).get('/api/ratings/testsong123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('songId', 'testsong123');
      expect(response.body).toHaveProperty('thumbsUp', 0);
      expect(response.body).toHaveProperty('thumbsDown', 0);
    });

    test('should return correct counts after ratings', async () => {
      // Add some ratings directly to DB
      const db = app.locals.db;
      const stmt = db.prepare('INSERT INTO song_ratings (song_id, user_id, rating) VALUES (?, ?, ?)');
      stmt.run('song123', 'user1', 1);
      stmt.run('song123', 'user2', 1);
      stmt.run('song123', 'user3', -1);

      const response = await request(app).get('/api/ratings/song123');

      expect(response.status).toBe(200);
      expect(response.body.thumbsUp).toBe(2);
      expect(response.body.thumbsDown).toBe(1);
    });
  });

  describe('GET /api/ratings/:songId/check', () => {
    test('should return hasRated false for new user', async () => {
      const response = await request(app)
        .get('/api/ratings/testsong/check')
        .set('x-forwarded-for', '192.168.1.100');

      expect(response.status).toBe(200);
      expect(response.body.hasRated).toBe(false);
      expect(response.body.rating).toBeNull();
    });

    test('should return hasRated true for user who already rated', async () => {
      // Add a rating
      const db = app.locals.db;
      const stmt = db.prepare('INSERT INTO song_ratings (song_id, user_id, rating) VALUES (?, ?, ?)');
      stmt.run('song123', '192.168.1.100', 1);

      const response = await request(app)
        .get('/api/ratings/song123/check')
        .set('x-forwarded-for', '192.168.1.100');

      expect(response.status).toBe(200);
      expect(response.body.hasRated).toBe(true);
      expect(response.body.rating).toBe(1);
    });

    test('should detect IP from x-forwarded-for header', async () => {
      const db = app.locals.db;
      const stmt = db.prepare('INSERT INTO song_ratings (song_id, user_id, rating) VALUES (?, ?, ?)');
      stmt.run('song123', '10.0.0.1', -1);

      const response = await request(app)
        .get('/api/ratings/song123/check')
        .set('x-forwarded-for', '10.0.0.1, 192.168.1.1');

      expect(response.body.hasRated).toBe(true);
      expect(response.body.rating).toBe(-1);
    });

    test('should detect IP from x-real-ip header', async () => {
      const db = app.locals.db;
      const stmt = db.prepare('INSERT INTO song_ratings (song_id, user_id, rating) VALUES (?, ?, ?)');
      stmt.run('song123', '172.16.0.1', 1);

      const response = await request(app)
        .get('/api/ratings/song123/check')
        .set('x-real-ip', '172.16.0.1');

      expect(response.body.hasRated).toBe(true);
      expect(response.body.rating).toBe(1);
    });
  });

  describe('POST /api/ratings', () => {
    test('should create new rating successfully', async () => {
      const response = await request(app)
        .post('/api/ratings')
        .set('x-forwarded-for', '192.168.1.100')
        .send({ songId: 'newsong123', rating: 1 });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.songId).toBe('newsong123');
      expect(response.body.thumbsUp).toBe(1);
      expect(response.body.thumbsDown).toBe(0);
    });

    test('should accept thumbs down rating (-1)', async () => {
      const response = await request(app)
        .post('/api/ratings')
        .set('x-forwarded-for', '192.168.1.100')
        .send({ songId: 'newsong123', rating: -1 });

      expect(response.status).toBe(201);
      expect(response.body.thumbsUp).toBe(0);
      expect(response.body.thumbsDown).toBe(1);
    });

    test('should return 400 for missing songId', async () => {
      const response = await request(app)
        .post('/api/ratings')
        .send({ rating: 1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    test('should return 400 for missing rating', async () => {
      const response = await request(app)
        .post('/api/ratings')
        .send({ songId: 'song123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    test('should return 400 for invalid rating value (0)', async () => {
      const response = await request(app)
        .post('/api/ratings')
        .set('x-forwarded-for', '192.168.1.100')
        .send({ songId: 'song123', rating: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Rating must be 1');
    });

    test('should return 400 for invalid rating value (2)', async () => {
      const response = await request(app)
        .post('/api/ratings')
        .send({ songId: 'song123', rating: 2 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Rating must be 1 (thumbs up) or -1 (thumbs down)');
    });

    test('should return 409 for duplicate rating', async () => {
      // First rating
      await request(app)
        .post('/api/ratings')
        .set('x-forwarded-for', '192.168.1.100')
        .send({ songId: 'song123', rating: 1 });

      // Second rating from same IP
      const response = await request(app)
        .post('/api/ratings')
        .set('x-forwarded-for', '192.168.1.100')
        .send({ songId: 'song123', rating: -1 });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already rated');
    });

    test('should allow different users to rate same song', async () => {
      const response1 = await request(app)
        .post('/api/ratings')
        .set('x-forwarded-for', '192.168.1.100')
        .send({ songId: 'song123', rating: 1 });

      const response2 = await request(app)
        .post('/api/ratings')
        .set('x-forwarded-for', '192.168.1.101')
        .send({ songId: 'song123', rating: -1 });

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);

      const response3 = await request(app).get('/api/ratings/song123');
      expect(response3.body.thumbsUp).toBe(1);
      expect(response3.body.thumbsDown).toBe(1);
    });

    test('should allow same user to rate different songs', async () => {
      const response1 = await request(app)
        .post('/api/ratings')
        .set('x-forwarded-for', '192.168.1.100')
        .send({ songId: 'song1', rating: 1 });

      const response2 = await request(app)
        .post('/api/ratings')
        .set('x-forwarded-for', '192.168.1.100')
        .send({ songId: 'song2', rating: -1 });

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
    });

    test('should update vote counts correctly with multiple ratings', async () => {
      // Add multiple ratings
      await request(app)
        .post('/api/ratings')
        .set('x-forwarded-for', '192.168.1.1')
        .send({ songId: 'popular_song', rating: 1 });

      await request(app)
        .post('/api/ratings')
        .set('x-forwarded-for', '192.168.1.2')
        .send({ songId: 'popular_song', rating: 1 });

      await request(app)
        .post('/api/ratings')
        .set('x-forwarded-for', '192.168.1.3')
        .send({ songId: 'popular_song', rating: 1 });

      const response = await request(app)
        .post('/api/ratings')
        .set('x-forwarded-for', '192.168.1.4')
        .send({ songId: 'popular_song', rating: -1 });

      expect(response.body.thumbsUp).toBe(3);
      expect(response.body.thumbsDown).toBe(1);
    });
  });
});
