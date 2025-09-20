// quick: creates the DB and seeds a small set of data for testing
// if I want a fresh start during development, I'll uncomment the remove lines below

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'discoverhealth.db');

// if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); // use this to wipe and start fresh

const db = new Database(dbPath);

// enable foreign keys (sqlite needs a reminder)
db.exec('PRAGMA foreign_keys = ON;');

// create the tables requested by the brief
db.exec(`
  CREATE TABLE IF NOT EXISTS healthcare_resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    country TEXT NOT NULL,
    region TEXT NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    description TEXT NOT NULL,
    recommendations INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    isAdmin INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id INTEGER NOT NULL,
    review TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    FOREIGN KEY(resource_id) REFERENCES healthcare_resources(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// add a few resources so GET /api/resources?region=... works straight away
const seedResources = db.prepare(`
  INSERT INTO healthcare_resources (name, category, country, region, lat, lon, description, recommendations)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const hasAnyResources = db.prepare('SELECT COUNT(*) AS c FROM healthcare_resources').get().c > 0;

if (!hasAnyResources) {
  const seed = db.transaction(() => {
    seedResources.run(
      'St Thomas Hospital',
      'Hospital',
      'UK',
      'London',
      51.4980,
      -0.1195,
      'Teaching hospital by the Thames — quick test data.',
      5
    );
    seedResources.run(
      'Manchester Clinic',
      'Clinic',
      'UK',
      'Manchester',
      53.4808,
      -2.2426,
      'City clinic — used for Manchester testing.',
      2
    );
    seedResources.run(
      'Southampton Health Centre',
      'Health Centre',
      'UK',
      'Southampton',
      50.9097,
      -1.4044,
      'Family health services — used for Southampton testing.',
      0
    );
  });
  seed();
}

// add two users for later (login/tests)
db.exec(`
  INSERT OR IGNORE INTO users (username, password, isAdmin)
  VALUES ('admin', 'password', 1), ('user', 'password', 0);
`);

console.log('✅ DB ready at', dbPath);
