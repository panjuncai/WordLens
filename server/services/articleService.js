const Joi = require('joi');
const articleModel = require('../models/articleModel');

const articleSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  content: Joi.string().min(1).required(),
});

async function list(userId) {
  return articleModel.listByUser(userId);
}

async function get(userId, id) {
  const article = await articleModel.findById(id, userId);
  if (!article) {
    const err = new Error('Not found');
    err.status = 404;
    throw err;
  }
  return article;
}

async function create(userId, payload) {
  const { title, content } = await articleSchema.validateAsync(payload);
  const res = await articleModel.create(userId, title, content);
  return { id: res.lastID, title, content };
}

async function update(userId, id, payload) {
  const { title, content } = await articleSchema.validateAsync(payload);
  const existing = await articleModel.findById(id, userId);
  if (!existing) {
    const err = new Error('Not found');
    err.status = 404;
    throw err;
  }
  await articleModel.update(id, userId, title, content);
  return { id, title, content };
}

async function remove(userId, id) {
  const existing = await articleModel.findById(id, userId);
  if (!existing) {
    const err = new Error('Not found');
    err.status = 404;
    throw err;
  }
  await articleModel.remove(id, userId);
  return { ok: true };
}

module.exports = {
  list,
  get,
  create,
  update,
  remove,
};
