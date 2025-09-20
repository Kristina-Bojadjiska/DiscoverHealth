// DiscoverHealth Part A — minimal API
// endpoints:
// GET  /api/resources?region=RegionName  -> list resources in that region
// POST /api/resources                    -> add a new resource
// POST /api/resources/:id/recommend     -> increment recommendations for a resource

const express = require('express');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3000;

const dbPath = path.join(__dirname, 'discoverhealth.db');
const dbExists = fs.existsSync(dbPath);
console.log('[BOOT] DB:', dbPath, dbExists ? '(found)' : '(missing)');

const db = new Database(dbPath);
db.exec('PRAGMA foreign_keys = ON;');

// show tables on boot — helps checking the schema quickly
try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('[BOOT] tables:', tables.map(t => t.name).join(', '));
} catch (err) {
  console.error('[BOOT] could not list tables:', err);
}

app.use(express.json()); // parse JSON bodies

app.get('/', (req, res) => {
  res
    .status(200)
    .send(`<h2>DiscoverHealth Part A API</h2><p>Try: <code>/api/resources?region=London</code></p>`);
});

/* GET /api/resources?region=RegionName
   returns all resources for an exact region match */
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

/* POST /api/resources
   add a resource. I do some basic checks so the DB stays clean. */
app.post('/api/resources', (req, res) => {
  const { name, category, country, region, lat, lon, description } = req.body || {};

  const missing = [];
  if (!name) missing.push('name');
  if (!category) missing.push('category');
  if (!country) missing.push('country');
  if (!region) missing.push('region');
  if (lat === undefined) missing.push('lat');
  if (lon === undefined) missing.push('lon');
  if (!description) missing.push('description');

  if (missing.length) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
  }

  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    return res.status(400).json({ error: 'lat and lon must be valid numbers' });
  }

  try {
    const insert = db.prepare(`
      INSERT INTO healthcare_resources (name, category, country, region, lat, lon, description, recommendations)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);
    const result = insert.run(
      String(name).trim(),
      String(category).trim(),
      String(country).trim(),
      String(region).trim(),
      latNum,
      lonNum,
      String(description).trim()
    );

    return res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error('[POST /api/resources] error:', err);
    return res.status(500).json({ error: 'Failed to add resource' });
  }
});

/* POST /api/resources/:id/recommend
   increment recommendations for a resource id */
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
