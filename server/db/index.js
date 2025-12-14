const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(path.join(__dirname, '..', 'data.db'));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    azure_key TEXT,
    azure_region TEXT,
    azure_voice TEXT,
    study_total_ms INTEGER DEFAULT 0,
    study_today_ms INTEGER DEFAULT 0,
    study_today_date TEXT
  )`);
  db.run('ALTER TABLE users ADD COLUMN azure_key TEXT', () => {});
  db.run('ALTER TABLE users ADD COLUMN azure_region TEXT', () => {});
  db.run('ALTER TABLE users ADD COLUMN azure_voice TEXT', () => {});
  db.run('ALTER TABLE users ADD COLUMN study_total_ms INTEGER DEFAULT 0', () => {});
  db.run('ALTER TABLE users ADD COLUMN study_today_ms INTEGER DEFAULT 0', () => {});
  db.run('ALTER TABLE users ADD COLUMN study_today_date TEXT', () => {});
  db.run(`CREATE TABLE IF NOT EXISTS user_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
});

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function cb(err) {
    if (err) reject(err);
    else resolve(this);
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

module.exports = {
  db,
  run,
  get,
};
