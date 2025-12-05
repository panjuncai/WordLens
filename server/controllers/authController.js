const authService = require('../services/authService');
const userModel = require('../models/userModel');

async function register(req, res, next) {
  const { email, password } = req.body || {};
  try {
    const data = await authService.register(email, password);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  const { email, password } = req.body || {};
  try {
    const data = await authService.login(email, password);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await userModel.findById(req.user.id);
    res.json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  me,
};
