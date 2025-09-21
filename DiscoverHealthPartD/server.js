// DiscoverHealth Part C — API with Validation (Task 7)

const express = require('express');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const cors = require('cors');

const app = express();
//before
// app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
//after
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());

const PORT = 3000;
const dbPath = path.join(__dirname, 'discoverhealth.db');
console.log('[BOOT] DB:', dbPath, fs.existsSync(dbPath) ? '(found)' : '(missing)');

const db = new Database(dbPath);
db.exec('PRAGMA foreign_keys = ON;');

try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('[BOOT] tables:', tables.map(t => t.name).join(', '));
} catch (err) {
  console.error('[BOOT] could not list tables:', err);
}

app.get('/', (_req, res) => {
  res.send('DiscoverHealth API is running. Try <code>/api/resources?region=London</code>');
});

/* GET /api/resources?region=RegionName */
app.get('/api/resources', (req, res) => {
  const region = typeof req.query.region === 'string' ? req.query.region.trim() : '';
  if (!region) {
    return res.status(400).json({ error: 'Region query parameter is required' });
  }
  try {
    const stmt = db.prepare('SELECT * FROM healthcare_resources WHERE region = ?');
    const rows = stmt.all(region);
    return res.json(rows);
  } catch (err) {
    console.error('[GET /api/resources] error:', err);
    return res.status(500).json({ error: 'Failed to retrieve resources' });
  }
});

/* POST /api/resources — stricter validation for Part C */
app.post('/api/resources', (req, res) => {
  const { name, category, country, region, lat, lon, description } = req.body || {};

  // Validation: check missing/empty fields
  if (!name?.trim() || !category?.trim() || !country?.trim() || !region?.trim() ||
      lat === undefined || lon === undefined || !description?.trim()) {
    return res.status(400).json({
      error: 'All fields are required: name, category, country, region, lat, lon, description'
    });
  }

  // Extra robustness tweak: lat/lon must be numbers
  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    return res.status(400).json({ error: 'Latitude and longitude must be numbers' });
  }

  try {
    const insert = db.prepare(`
      INSERT INTO healthcare_resources (name, category, country, region, lat, lon, description, recommendations)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);
    const result = insert.run(
      name.trim(),
      category.trim(),
      country.trim(),
      region.trim(),
      latNum,
      lonNum,
      description.trim()
    );
    return res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error('[POST /api/resources] error:', err);
    return res.status(500).json({ error: 'Failed to add resource' });
  }
});

/* POST /api/resources/:id/recommend */
app.post('/api/resources/:id/recommend', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid resource id' });
  }
  try {
    const update = db.prepare(`
      UPDATE healthcare_resources
      SET recommendations = recommendations + 1
      WHERE id = ?
    `);
    const result = update.run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    return res.json({ message: 'Recommendation added' });
  } catch (err) {
    console.error('[POST /api/resources/:id/recommend] error:', err);
    return res.status(500).json({ error: 'Failed to recommend resource' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
