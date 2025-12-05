const { get, run } = require('../db');

const findByEmail = (email) => get('SELECT * FROM users WHERE email = ?', [email]);
const findById = (id) => get('SELECT * FROM users WHERE id = ?', [id]);
const create = (email, passwordHash) => run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, passwordHash]);
const updateConfig = (id, { azureKey, azureRegion, azureVoice }) => run(
  'UPDATE users SET azure_key = ?, azure_region = ?, azure_voice = ? WHERE id = ?',
  [azureKey || '', azureRegion || '', azureVoice || '', id],
);

module.exports = {
  findByEmail,
  findById,
  create,
  updateConfig,
};
