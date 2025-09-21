const dao = require('../daos/resourcesDao');

exports.list = (req, res) => {
  const { region } = req.query;
  if (!region) return res.status(400).json({ error: 'Region query parameter is required' });
  try { res.json(dao.listByRegion(region)); }
  catch { res.status(500).json({ error: 'Failed to retrieve resources' }); }
};

exports.create = (req, res) => {
  const { name, category, country, region, lat, lon, description } = req.body || {};
  if (!name?.trim() || !category?.trim() || !country?.trim() || !region?.trim()
      || lat === undefined || lon === undefined || !description?.trim())
    return res.status(400).json({ error: 'All fields are required: name, category, country, region, lat, lon, description' });
  try {
    const info = dao.create({ name: name.trim(), category: category.trim(), country: country.trim(),
                              region: region.trim(), lat, lon, description: description.trim() });
    res.status(201).json({ id: info.lastInsertRowid });
  } catch { res.status(500).json({ error: 'Failed to add resource' }); }
};

exports.recommend = (req, res) => {
  try {
    const info = dao.recommend(req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'Resource not found' });
    res.json({ message: 'Recommendation added' });
  } catch { res.status(500).json({ error: 'Failed to recommend resource' }); }
};

exports.addReview = (req, res) => {
  const { review } = req.body || {};
  if (!review?.trim()) return res.status(400).json({ error: 'Review text is required' });
  try {
    if (!dao.exists(req.params.id)) return res.status(404).json({ error: 'Resource not found' });
    const info = dao.addReview(req.params.id, review.trim(), req.session.userId);
    res.status(201).json({ id: info.lastInsertRowid, message: 'Review added' });
  } catch { res.status(500).json({ error: 'Failed to add review' }); }
};
