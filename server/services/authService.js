const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const userModel = require('../models/userModel');
const { jwtSecret } = require('../config/env');

const emailSchema = Joi.string().email().required();
const passwordSchema = Joi.string().min(1).required();

async function register(email, password) {
  await emailSchema.validateAsync(email);
  await passwordSchema.validateAsync(password);
  const existing = await userModel.findByEmail(email);
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 409;
    throw err;
  }
  const hash = await bcrypt.hash(password, 10);
  const res = await userModel.create(email, hash);
  const user = { id: res.lastID, email };
  const token = jwt.sign(user, jwtSecret, { expiresIn: '7d' });
  return { user, token };
}

async function login(email, password) {
  await emailSchema.validateAsync(email);
  await passwordSchema.validateAsync(password);
  const user = await userModel.findByEmail(email);
  if (!user) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  const token = jwt.sign({ id: user.id, email: user.email }, jwtSecret, { expiresIn: '7d' });
  return { user: { id: user.id, email: user.email }, token };
}

module.exports = {
  register,
  login,
};
