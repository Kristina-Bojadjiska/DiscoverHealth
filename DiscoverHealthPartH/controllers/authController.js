const users = require('../daos/usersDao');

exports.signup = (req, res) => {
  const { username, password } = req.body || {};
  if (!username?.trim() || !password?.trim())
    return res.status(400).json({ error: 'Username and password are required' });
  try {
    if (users.findByUsername(username.trim()))
      return res.status(400).json({ error: 'Username already exists' });
    users.create(username.trim(), password.trim());
    res.status(201).json({ message: `Signup successful! Please log in as ${username.trim()}.` });
  } catch { res.status(500).json({ error: 'Failed to create user' }); }
};

exports.login = (req, res) => {
  const { username, password } = req.body || {};
  if (!username?.trim() || !password?.trim())
    return res.status(400).json({ error: 'Username and password are required' });
  const u = users.findByUsername(username.trim());
  if (!u || u.password !== password.trim())
    return res.status(401).json({ error: 'Invalid username or password' });
  req.session.userId = u.id;
  res.json({ message: 'Login successful', username: u.username });
};

exports.user = (req, res) => {
  const row = users.findUsernameById(req.session.userId);
  if (!row) return res.status(401).json({ error: 'Not logged in' });
  res.json({ username: row.username });
};

exports.logout = (req, res) => {
  req.session.destroy(err => err
    ? res.status(500).json({ error: 'Logout failed' })
    : res.json({ message: 'Logout successful' }));
};
