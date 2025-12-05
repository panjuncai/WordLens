const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/config', authMiddleware, userController.getConfig);
router.put('/config', authMiddleware, userController.updateConfig);

module.exports = router;
