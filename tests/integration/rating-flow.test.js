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

// Create full test server
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

  // Get ratings
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

  // Check rating
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

  // Submit rating
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

  app.locals.db = db;
  return app;
}

describe('Rating System Integration', () => {
  let app;

  beforeEach(() => {
    app = createTestServer();
  });

  afterEach(() => {
    if (app.locals.db) {
      app.locals.db.close();
    }
  });

  describe('Complete Rating Flow', () => {
    test('should complete full rating lifecycle', async () => {
      const songId = 'newsong123';
      const userIp = '192.168.1.100';

      // 1. Check initial state - no ratings
      const initial = await request(app).get(`/api/ratings/${songId}`);
      expect(initial.body.thumbsUp).toBe(0);
      expect(initial.body.thumbsDown).toBe(0);

      // 2. Check if user has rated - should be false
      const checkBefore = await request(app)
        .get(`/api/ratings/${songId}/check`)
        .set('x-forwarded-for', userIp);
      expect(checkBefore.body.hasRated).toBe(false);

      // 3. Submit thumbs up
      const rating = await request(app)
        .post('/api/ratings')
        .set('x-forwarded-for', userIp)
        .send({ songId, rating: 1 });
      expect(rating.status).toBe(201);
      expect(rating.body.thumbsUp).toBe(1);

      // 4. Check if user has rated - should be true
      const checkAfter = await request(app)
        .get(`/api/ratings/${songId}/check`)
        .set('x-forwarded-for', userIp);
      expect(checkAfter.body.hasRated).toBe(true);
      expect(checkAfter.body.rating).toBe(1);

      // 5. Try to rate again - should get 409
      const duplicate = await request(app)
        .post('/api/ratings')
        .set('x-forwarded-for', userIp)
        .send({ songId, rating: -1 });
      expect(duplicate.status).toBe(409);

      // 6. Verify final counts
      const final = await request(app).get(`/api/ratings/${songId}`);
      expect(final.body.thumbsUp).toBe(1);
      expect(final.body.thumbsDown).toBe(0);
    });

    test('should handle multiple users rating same song', async () => {
      const songId = 'popularsong';

      // User 1 rates thumbs up
      await request(app)
        .post('/api/ratings')
        .set('x-forwarded-for', '192.168.1.1')
        .send({ songId, rating: 1 });

      // User 2 rates thumbs up
      await request(app)
        .post('/api/ratings')
        .set('x-forwarded-for', '192.168.1.2')
        .send({ songId, rating: 1 });

      // User 3 rates thumbs down
      await request(app)
        .post('/api/ratings')
        .set('x-forwarded-for', '192.168.1.3')
        .send({ songId, rating: -1 });

      // User 4 rates thumbs up
      await request(app)
        .post('/api/ratings')
        .set('x-forwarded-for', '192.168.1.4')
        .send({ songId, rating: 1 });

      // Check final counts
      const counts = await request(app).get(`/api/ratings/${songId}`);
      expect(counts.body.thumbsUp).toBe(3);
      expect(counts.body.thumbsDown).toBe(1);
    });

    test('should handle song change scenario', async () => {
      const user = '192.168.1.100';

      // Rate first song
      await request(app)
        .post('/api/ratings')
        .set('x-forwarded-for', user)
        .send({ songId: 'song1', rating: 1 });

      // Check first song
      const check1 = await request(app)
        .get('/api/ratings/song1/check')
        .set('x-forwarded-for', user);
      expect(check1.body.hasRated).toBe(true);

      // Song changes to song2
      // Check second song - should not be rated
      const check2 = await request(app)
        .get('/api/ratings/song2/check')
        .set('x-forwarded-for', user);
      expect(check2.body.hasRated).toBe(false);

      // Rate second song
      await request(app)
        .post('/api/ratings')
        .set('x-forwarded-for', user)
        .send({ songId: 'song2', rating: -1 });

      // Verify both songs are rated independently
      const final1 = await request(app).get('/api/ratings/song1');
      const final2 = await request(app).get('/api/ratings/song2');

      expect(final1.body.thumbsUp).toBe(1);
      expect(final2.body.thumbsDown).toBe(1);
    });

    test('should handle concurrent ratings from different IPs', async () => {
      const songId = 'concurrentsong';

      // Simulate concurrent requests
      const requests = [];
      for (let i = 1; i <= 10; i++) {
        requests.push(
          request(app)
            .post('/api/ratings')
            .set('x-forwarded-for', `192.168.1.${i}`)
            .send({ songId, rating: i % 2 === 0 ? 1 : -1 })
        );
      }

      await Promise.all(requests);

      // Check counts - should have 5 up and 5 down
      const counts = await request(app).get(`/api/ratings/${songId}`);
      expect(counts.body.thumbsUp).toBe(5);
      expect(counts.body.thumbsDown).toBe(5);
    });

    test('should maintain data integrity after errors', async () => {
      const songId = 'errorsong';
      const user = '192.168.1.100';

      // Valid rating
      await request(app)
        .post('/api/ratings')
        .set('x-forwarded-for', user)
        .send({ songId, rating: 1 });

      // Invalid rating attempt
      await request(app)
        .post('/api/ratings')
        .set('x-forwarded-for', '192.168.1.101')
        .send({ songId, rating: 5 });

      // Duplicate rating attempt
      await request(app)
        .post('/api/ratings')
        .set('x-forwarded-for', user)
        .send({ songId, rating: -1 });

      // Check counts - should only have the one valid rating
      const counts = await request(app).get(`/api/ratings/${songId}`);
      expect(counts.body.thumbsUp).toBe(1);
      expect(counts.body.thumbsDown).toBe(0);
    });

    test('should handle IP from different header sources', async () => {
      const songId = 'headersong';

      // Rate with x-forwarded-for
      await request(app)
        .post('/api/ratings')
        .set('x-forwarded-for', '10.0.0.1')
        .send({ songId, rating: 1 });

      // Rate with x-real-ip
      await request(app)
        .post('/api/ratings')
        .set('x-real-ip', '10.0.0.2')
        .send({ songId, rating: 1 });

      // Check counts
      const counts = await request(app).get(`/api/ratings/${songId}`);
      expect(counts.body.thumbsUp).toBe(2);
    });
  });
});
