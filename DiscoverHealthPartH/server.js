// D:\Project WAD\DiscoverHealth\DiscoverHealthPartH\server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');

// Boot the DB once (creates tables if missing)
require('./db/db');

// Middleware
const logger = require('./middleware/logger');

const app = express();

// CORS for dev (5173). When serving from 3000, same-origin means CORS won't be used.
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

app.use(session({
  name: 'dh.sid',
  secret: 'discoverhealth-secret',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: false,          // dev only
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24h
  }
}));

app.use(logger); // simple request logger

// --- Mount routers (replaces inline handlers) ---
app.use('/api', require('./routes/authRoutes'));
app.use('/api', require('./routes/resourceRoutes'));

// --- Serve React build ---
app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

// --- SPA fallback (Express 5-safe; exclude /api) ---
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
