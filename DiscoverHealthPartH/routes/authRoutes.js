const router = require('express').Router();
const c = require('../controllers/authController');

router.post('/signup', c.signup);
router.post('/login', c.login);
router.get('/user', c.user);
router.post('/logout', c.logout);

module.exports = router;
