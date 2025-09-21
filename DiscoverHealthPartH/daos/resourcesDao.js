const db = require('../db/db');

exports.listByRegion = (region) => {
  let q = `SELECT r.*, GROUP_CONCAT(rv.review) AS reviews
           FROM healthcare_resources r
           LEFT JOIN reviews rv ON r.id = rv.resource_id`;
  const params = [];
  if (region) { q += ' WHERE r.region = ?'; params.push(region); }
  q += ' GROUP BY r.id';
  const rows = db.prepare(q).all(...params);
  return rows.map(r => ({ ...r, reviews: r.reviews ? r.reviews.split(',') : [] }));
};

exports.create = ({ name, category, country, region, lat, lon, description }) =>
  db.prepare(`INSERT INTO healthcare_resources
    (name, category, country, region, lat, lon, description, recommendations)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)`)
    .run(name, category, country, region, lat, lon, description);

exports.recommend = (id) =>
  db.prepare('UPDATE healthcare_resources SET recommendations = recommendations + 1 WHERE id = ?').run(id);

exports.addReview = (resourceId, review, userId) =>
  db.prepare('INSERT INTO reviews (resource_id, review, user_id) VALUES (?, ?, ?)')
    .run(resourceId, review, userId);

exports.exists = (id) =>
  db.prepare('SELECT id FROM healthcare_resources WHERE id = ?').get(id);
