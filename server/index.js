const path = require('path');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const dotenv = require('dotenv');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const defaultVoice = process.env.AZURE_VOICE || 'fr-FR-DeniseNeural';
const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
const db = new sqlite3.Database(path.join(__dirname, 'data.db'));

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

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const getUserByEmail = (email) => new Promise((resolve, reject) => {
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

const getUserById = (id) => new Promise((resolve, reject) => {
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

const createUser = (email, passwordHash) => new Promise((resolve, reject) => {
  db.run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, passwordHash], function cb(err) {
    if (err) reject(err);
    else resolve({ id: this.lastID, email });
  });
});

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body || {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email' });
  if (!password) return res.status(400).json({ error: 'Password required' });
  try {
    const existing = await getUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const user = await createUser(email, hash);
    const token = jwt.sign({ id: user.id, email: user.email }, jwtSecret, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('Register error', err.message);
    res.status(500).json({ error: 'Register failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const user = await getUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email }, jwtSecret, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('Login error', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: { id: req.user.id, email: req.user.email } });
});

app.get('/api/user/config', authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    res.json({
      azure_key: user?.azure_key || '',
      azure_region: user?.azure_region || '',
      azure_voice: user?.azure_voice || '',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load config' });
  }
});

app.put('/api/user/config', authMiddleware, (req, res) => {
  const { azure_key: azureKey, azure_region: azureRegion, azure_voice: azureVoice } = req.body || {};
  db.run(
    'UPDATE users SET azure_key = ?, azure_region = ?, azure_voice = ? WHERE id = ?',
    [azureKey || '', azureRegion || '', azureVoice || '', req.user.id],
    (err) => {
      if (err) {
        console.error('Config update error', err.message);
        return res.status(500).json({ error: 'Failed to save config' });
      }
      return res.json({ ok: true });
    },
  );
});

app.get('/api/images', authMiddleware, async (req, res) => {
  const word = (req.query.word || '').trim();
  const offset = Number(req.query.offset || 0);
  if (!word) return res.status(400).json({ error: 'Missing word' });
  try {
    const query = `${word} photo`;
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=${offset + 1}&count=5&cc=FR&setLang=fr`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
    });
    const $ = cheerio.load(response.data);
    const urls = [];
    const seen = new Set();
    $('.iusc').each((_, el) => {
      const meta = $(el).attr('m');
      if (meta) {
        try {
          const m = JSON.parse(meta);
          if (m?.murl && /^https?:\/\//.test(m.murl) && !seen.has(m.murl)) {
            urls.push(m.murl);
            seen.add(m.murl);
          }
        } catch (err) {
          // ignore parse errors
        }
      }
      if (urls.length >= 5) return false;
      return undefined;
    });
    res.json({ urls });
  } catch (error) {
    console.error('Image fetch error', error.message);
    res.status(500).json({ error: 'Image fetch failed' });
  }
});

app.post('/api/tts', authMiddleware, async (req, res) => {
  const { text, voice } = req.body || {};
  const user = await getUserById(req.user.id);
  const key = user?.azure_key || process.env.AZURE_SPEECH_KEY;
  const region = user?.azure_region || process.env.AZURE_REGION;
  const voiceName = voice || user?.azure_voice || defaultVoice;
  if (!key || !region) {
    return res.status(500).json({ error: 'Missing AZURE_SPEECH_KEY or AZURE_REGION env vars' });
  }
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const ssml = `<speak version="1.0" xml:lang="fr-FR"><voice name="${voiceName}">${text}</voice></speak>`;

  try {
    const ttsResponse = await axios.post(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      ssml,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Ocp-Apim-Subscription-Region': region,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        },
        responseType: 'arraybuffer',
        proxy: false, // avoid local HTTP(S)_PROXY intercepts that can cause ECONNRESET
      },
    );

    const audioBase64 = Buffer.from(ttsResponse.data).toString('base64');
    res.json({ audioBase64, format: 'audio/mp3' });
  } catch (error) {
    const status = error.response?.status;
    const data = error.response?.data;
    const bodyText = typeof data === 'string' ? data : data?.error?.message || '';
    console.error('Azure TTS error', status || '', bodyText || error.message);
    res.status(status || 500).json({
      error: 'Azure TTS request failed',
      status: status || 'unknown',
      message: bodyText || error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
