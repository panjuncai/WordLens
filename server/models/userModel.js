const { get, run } = require('../db');

const findByEmail = (email) => get('SELECT * FROM users WHERE email = ?', [email]);
const findById = (id) => get('SELECT * FROM users WHERE id = ?', [id]);
const create = (email, passwordHash) => run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, passwordHash]);
const updateConfig = (id, { azureKey, azureRegion, azureVoice }) => run(
  'UPDATE users SET azure_key = ?, azure_region = ?, azure_voice = ? WHERE id = ?',
  [azureKey || '', azureRegion || '', azureVoice || '', id],
);

const updateStudyStats = (id, { studyTotalMs, studyTodayMs, studyTodayDate }) => run(
  'UPDATE users SET study_total_ms = ?, study_today_ms = ?, study_today_date = ? WHERE id = ?',
  [studyTotalMs || 0, studyTodayMs || 0, studyTodayDate || null, id],
);

module.exports = {
  findByEmail,
  findById,
  create,
  updateConfig,
  updateStudyStats,
};
