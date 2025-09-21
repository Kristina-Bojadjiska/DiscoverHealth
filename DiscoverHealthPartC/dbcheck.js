const Database = require('better-sqlite3');
const fs = require('fs');

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error('Usage: node dbcheck.js <db-file>');
  process.exit(1);
}
try {
  const db = new Database(file);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
  console.log('[DB]', file, 'tables:', tables);

  if (tables.includes('healthcare_resources')) {
    const cnt = db.prepare('SELECT COUNT(*) AS c FROM healthcare_resources').get().c;
    console.log('healthcare_resources rows =', cnt);
  }
} catch (e) {
  console.error('Error opening DB:', e.message);
  process.exit(1);
}
