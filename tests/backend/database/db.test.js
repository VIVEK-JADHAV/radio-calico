const Database = require('better-sqlite3');

describe('Database Initialization', () => {
  let db;

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  describe('Users Table', () => {
    beforeEach(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });

    test('should create users table successfully', () => {
      const tableInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
      expect(tableInfo).toBeDefined();
      expect(tableInfo.name).toBe('users');
    });

    test('should insert user with valid data', () => {
      const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
      const result = stmt.run('John Doe', 'john@example.com');

      expect(result.lastInsertRowid).toBe(1);
      expect(result.changes).toBe(1);

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
    });

    test('should enforce UNIQUE constraint on email', () => {
      const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
      stmt.run('User One', 'test@example.com');

      expect(() => {
        stmt.run('User Two', 'test@example.com');
      }).toThrow(/UNIQUE constraint failed/);
    });

    test('should enforce NOT NULL constraint on name', () => {
      const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');

      expect(() => {
        stmt.run(null, 'test@example.com');
      }).toThrow(/NOT NULL constraint failed/);
    });

    test('should auto-increment id field', () => {
      const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
      const result1 = stmt.run('User 1', 'user1@example.com');
      const result2 = stmt.run('User 2', 'user2@example.com');

      expect(result1.lastInsertRowid).toBe(1);
      expect(result2.lastInsertRowid).toBe(2);
    });
  });

  describe('Song Ratings Table', () => {
    beforeEach(() => {
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
    });

    test('should create song_ratings table successfully', () => {
      const tableInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='song_ratings'").get();
      expect(tableInfo).toBeDefined();
      expect(tableInfo.name).toBe('song_ratings');
    });

    test('should insert rating with valid data', () => {
      const stmt = db.prepare('INSERT INTO song_ratings (song_id, user_id, rating) VALUES (?, ?, ?)');
      const result = stmt.run('song123', '192.168.1.1', 1);

      expect(result.lastInsertRowid).toBe(1);
      expect(result.changes).toBe(1);

      const rating = db.prepare('SELECT * FROM song_ratings WHERE id = ?').get(result.lastInsertRowid);
      expect(rating.song_id).toBe('song123');
      expect(rating.user_id).toBe('192.168.1.1');
      expect(rating.rating).toBe(1);
    });

    test('should enforce CHECK constraint on rating (only 1 or -1)', () => {
      const stmt = db.prepare('INSERT INTO song_ratings (song_id, user_id, rating) VALUES (?, ?, ?)');

      // Valid ratings
      expect(() => stmt.run('song1', 'user1', 1)).not.toThrow();
      expect(() => stmt.run('song2', 'user1', -1)).not.toThrow();

      // Invalid ratings
      expect(() => stmt.run('song3', 'user1', 0)).toThrow(/CHECK constraint failed/);
      expect(() => stmt.run('song4', 'user1', 2)).toThrow(/CHECK constraint failed/);
      expect(() => stmt.run('song5', 'user1', 5)).toThrow(/CHECK constraint failed/);
    });

    test('should enforce UNIQUE constraint on (song_id, user_id)', () => {
      const stmt = db.prepare('INSERT INTO song_ratings (song_id, user_id, rating) VALUES (?, ?, ?)');
      stmt.run('song123', '192.168.1.1', 1);

      // Same user trying to rate same song again
      expect(() => {
        stmt.run('song123', '192.168.1.1', -1);
      }).toThrow(/UNIQUE constraint failed/);
    });

    test('should allow same user to rate different songs', () => {
      const stmt = db.prepare('INSERT INTO song_ratings (song_id, user_id, rating) VALUES (?, ?, ?)');

      expect(() => {
        stmt.run('song1', '192.168.1.1', 1);
        stmt.run('song2', '192.168.1.1', -1);
        stmt.run('song3', '192.168.1.1', 1);
      }).not.toThrow();

      const count = db.prepare('SELECT COUNT(*) as count FROM song_ratings WHERE user_id = ?').get('192.168.1.1');
      expect(count.count).toBe(3);
    });

    test('should allow different users to rate same song', () => {
      const stmt = db.prepare('INSERT INTO song_ratings (song_id, user_id, rating) VALUES (?, ?, ?)');

      expect(() => {
        stmt.run('song123', '192.168.1.1', 1);
        stmt.run('song123', '192.168.1.2', -1);
        stmt.run('song123', '192.168.1.3', 1);
      }).not.toThrow();

      const count = db.prepare('SELECT COUNT(*) as count FROM song_ratings WHERE song_id = ?').get('song123');
      expect(count.count).toBe(3);
    });

    test('should count thumbs up correctly', () => {
      const stmt = db.prepare('INSERT INTO song_ratings (song_id, user_id, rating) VALUES (?, ?, ?)');
      stmt.run('song123', 'user1', 1);
      stmt.run('song123', 'user2', 1);
      stmt.run('song123', 'user3', -1);

      const thumbsUp = db.prepare('SELECT COUNT(*) as count FROM song_ratings WHERE song_id = ? AND rating = 1').get('song123');
      expect(thumbsUp.count).toBe(2);
    });

    test('should count thumbs down correctly', () => {
      const stmt = db.prepare('INSERT INTO song_ratings (song_id, user_id, rating) VALUES (?, ?, ?)');
      stmt.run('song123', 'user1', 1);
      stmt.run('song123', 'user2', -1);
      stmt.run('song123', 'user3', -1);

      const thumbsDown = db.prepare('SELECT COUNT(*) as count FROM song_ratings WHERE song_id = ? AND rating = -1').get('song123');
      expect(thumbsDown.count).toBe(2);
    });
  });
});
