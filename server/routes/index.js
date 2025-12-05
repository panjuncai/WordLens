const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const mediaRoutes = require('./mediaRoutes');
const articleRoutes = require('./articleRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/articles', articleRoutes);
router.use('/', mediaRoutes);

module.exports = router;
