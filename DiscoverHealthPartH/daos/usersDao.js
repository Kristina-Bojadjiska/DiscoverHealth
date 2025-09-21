const db = require('../db/db');

exports.findByUsername = (u) =>
  db.prepare('SELECT * FROM users WHERE username = ?').get(u);

exports.create = (u, p) =>
  db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(u, p);

exports.findUsernameById = (id) =>
  db.prepare('SELECT username FROM users WHERE id = ?').get(id);
