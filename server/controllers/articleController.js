const articleService = require('../services/articleService');

async function list(req, res, next) {
  try {
    const items = await articleService.list(req.user.id);
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const article = await articleService.get(req.user.id, req.params.id);
    res.json({ article });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const article = await articleService.create(req.user.id, req.body || {});
    res.json({ article });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const article = await articleService.update(req.user.id, req.params.id, req.body || {});
    res.json({ article });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await articleService.remove(req.user.id, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  get,
  create,
  update,
  remove,
};
