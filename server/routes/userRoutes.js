const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/config', authMiddleware, userController.getConfig);
router.put('/config', authMiddleware, userController.updateConfig);
router.get('/stats', authMiddleware, userController.getStudyStats);
router.post('/stats/time', authMiddleware, userController.addStudyTime);

module.exports = router;
