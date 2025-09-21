const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const session = require('express-session');
// bcrypt installed; keeping plaintext for compatibility with existing DB
// const bcrypt = require('bcrypt');

const app = express();

// CORS: allow Vite dev with credentials
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Sessions
app.use(session({
  name: 'dh.sid',               // tweak
  secret: 'discoverhealth-secret',
  resave: false,
  saveUninitialized: false,
  rolling: true,                // keep session fresh on activity
  cookie: {
    secure: false,              // dev only
    httpOnly: true,
    sameSite: 'lax',            // tweak
    maxAge: 24 * 60 * 60 * 1000 // 24h
  }
}));

app.use(express.json());

// DB
const dbPath = path.join(__dirname, 'discoverhealth.db');
console.log('[BOOT] Using DB at:', dbPath, fs.existsSync(dbPath) ? '(FOUND)' : '(MISSING)');
const db = new Database(dbPath);

try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('[BOOT] Tables in DB:', tables.map(t => t.name));
} catch (e) {
  console.error('[BOOT] Could not list tables:', e);
}

// Auth helper
function isAuthenticated(req, res, next) {
  if (req.session.userId) return next();
  return res.status(401).json({ error: 'Unauthorized: Please log in' });
}

// Root info
app.get('/', (req, res) => {
  res.send('DiscoverHealth API is running. Try <code>/api/resources?region=London</code>');
});

// Current user
app.get('/api/user', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  try {
    const row = db.prepare('SELECT username FROM users WHERE id = ?').get(req.session.userId);
    if (!row) return res.status(401).json({ error: 'Not logged in' });
    res.json({ username: row.username });
  } catch (e) {
    console.error('[GET /api/user] DB error:', e);
    res.status(500).json({ error: 'Failed to resolve user' });
  }
});

// Login (plaintext to match existing DB)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username?.trim() || !password?.trim()) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  try {
    const user = db.prepare('SELECT id, username, password FROM users WHERE username = ?')
      .get(username.trim());
    if (!user || user.password !== password.trim()) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    req.session.userId = user.id;
    res.json({ message: 'Login successful', username: user.username });
  } catch (e) {
    console.error('[POST /api/login] DB error:', e);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// Signup (plaintext insert for compatibility)
app.post('/api/signup', (req, res) => {
  const { username, password } = req.body || {};
  if (!username?.trim() || !password?.trim()) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  try {
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
    if (exists) return res.status(400).json({ error: 'Username already exists' });

    const info = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)')
      .run(username.trim(), password.trim());
    res.status(201).json({ message: 'User created', id: info.lastInsertRowid });
  } catch (e) {
    console.error('[POST /api/signup] DB error:', e);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('[POST /api/logout] Session destroy error:', err);
      return res.status(500).json({ error: 'Failed to log out' });
    }
    res.json({ message: 'Logout successful' });
  });
});

// GET resources
app.get('/api/resources', (req, res) => {
  const region = req.query.region;
  if (!region) return res.status(400).json({ error: 'Region query parameter is required' });
  try {
    const list = db.prepare('SELECT * FROM healthcare_resources WHERE region = ?').all(region);
    res.json(list);
  } catch (e) {
    console.error('[GET /api/resources] DB error:', e);
    res.status(500).json({ error: 'Failed to retrieve resources' });
  }
});

// POST resources (restricted)
app.post('/api/resources', isAuthenticated, (req, res) => {
  const { name, category, country, region, lat, lon, description } = req.body || {};
  if (!name?.trim() || !category?.trim() || !country?.trim() || !region?.trim()
      || lat === undefined || lon === undefined || !description?.trim()) {
    return res.status(400).json({ error: 'All fields are required: name, category, country, region, lat, lon, description' });
  }
  try {
    const info = db.prepare(`
      INSERT INTO healthcare_resources
        (name, category, country, region, lat, lon, description, recommendations)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(name.trim(), category.trim(), country.trim(), region.trim(), lat, lon, description.trim());
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (e) {
    console.error('[POST /api/resources] DB error:', e);
    res.status(500).json({ error: 'Failed to add resource' });
  }
});

// Recommend
app.post('/api/resources/:id/recommend', (req, res) => {
  try {
    const result = db.prepare(`
      UPDATE healthcare_resources SET recommendations = recommendations + 1 WHERE id = ?
    `).run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Resource not found' });
    res.json({ message: 'Recommendation added' });
  } catch (e) {
    console.error('[POST /api/resources/:id/recommend] DB error:', e);
    res.status(500).json({ error: 'Failed to recommend resource' });
  }
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
