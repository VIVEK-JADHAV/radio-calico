const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DATABASE_PATH || './database/app.db';
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
function initializeDatabase() {
  // Users table example
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Song ratings table
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

  console.log('Database initialized successfully');
}

// Initialize database on first run
initializeDatabase();

module.exports = db;
