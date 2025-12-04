const path = require('path');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const defaultVoice = process.env.AZURE_VOICE || 'fr-FR-DeniseNeural';

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/images', async (req, res) => {
  const word = (req.query.word || '').trim();
  const offset = Number(req.query.offset || 0);
  if (!word) return res.status(400).json({ error: 'Missing word' });
  try {
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(word)}&first=${offset + 1}&count=5`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36',
      },
    });
    const $ = cheerio.load(response.data);
    const urls = [];
    $('img').each((_, el) => {
      const src = $(el).attr('data-src') || $(el).attr('src');
      if (src && /^https?:\/\//.test(src)) {
        urls.push(src);
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

app.post('/api/tts', async (req, res) => {
  const { text, voice } = req.body || {};
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_REGION;
  if (!key || !region) {
    return res.status(500).json({ error: 'Missing AZURE_SPEECH_KEY or AZURE_REGION env vars' });
  }
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const ssml = `<speak version="1.0" xml:lang="fr-FR"><voice name="${voice || defaultVoice}">${text}</voice></speak>`;

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
