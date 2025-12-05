const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const articleController = require('../controllers/articleController');

const router = express.Router();

router.use(authMiddleware);
router.get('/', articleController.list);
router.post('/', articleController.create);
router.get('/:id', articleController.get);
router.put('/:id', articleController.update);
router.delete('/:id', articleController.remove);

module.exports = router;
