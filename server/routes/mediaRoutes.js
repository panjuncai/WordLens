const express = require('express');
const mediaController = require('../controllers/mediaController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/images', authMiddleware, mediaController.getImages);
router.post('/tts', authMiddleware, mediaController.tts);

module.exports = router;
