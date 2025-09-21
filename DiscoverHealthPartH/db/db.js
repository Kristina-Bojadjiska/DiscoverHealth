const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'discoverhealth.db'));

// Ensure tables exist (idempotent)
db.exec(`
CREATE TABLE IF NOT EXISTS healthcare_resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT, category TEXT, country TEXT, region TEXT,
  lat FLOAT, lon FLOAT, description TEXT,
  recommendations INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE, password TEXT, isAdmin INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resource_id INTEGER, review TEXT, user_id INTEGER,
  FOREIGN KEY (resource_id) REFERENCES healthcare_resources(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`);
module.exports = db;
