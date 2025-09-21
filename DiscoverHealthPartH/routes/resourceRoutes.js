const router = require('express').Router();
const c = require('../controllers/resourceController');
const requireAuth = require('../middleware/requireAuth');

router.get('/resources', c.list);
router.post('/resources', requireAuth, c.create);
router.post('/resources/:id/recommend', requireAuth, c.recommend);
router.post('/resources/:id/reviews', requireAuth, c.addReview);

module.exports = router;
