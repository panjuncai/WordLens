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
    azure_voice TEXT
  )`);
  db.run('ALTER TABLE users ADD COLUMN azure_key TEXT', () => {});
  db.run('ALTER TABLE users ADD COLUMN azure_region TEXT', () => {});
  db.run('ALTER TABLE users ADD COLUMN azure_voice TEXT', () => {});
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
