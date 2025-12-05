const { get, run, db } = require('../db');

const listByUser = (userId) => new Promise((resolve, reject) => {
  db.all('SELECT * FROM user_articles WHERE user_id = ? ORDER BY updated_at DESC', [userId], (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

const findById = (id, userId) => get('SELECT * FROM user_articles WHERE id = ? AND user_id = ?', [id, userId]);

const create = (userId, title, content) => run(
  'INSERT INTO user_articles (user_id, title, content) VALUES (?, ?, ?)',
  [userId, title, content],
);

const update = (id, userId, title, content) => run(
  'UPDATE user_articles SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
  [title, content, id, userId],
);

const remove = (id, userId) => run('DELETE FROM user_articles WHERE id = ? AND user_id = ?', [id, userId]);

module.exports = {
  listByUser,
  findById,
  create,
  update,
  remove,
};
