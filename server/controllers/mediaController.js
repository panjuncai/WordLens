const imageService = require('../services/imageService');
const ttsService = require('../services/ttsService');
const userModel = require('../models/userModel');

async function getImages(req, res, next) {
  const word = (req.query.word || '').trim();
  const offset = Number(req.query.offset || 0);
  if (!word) return res.status(400).json({ error: 'Missing word' });
  try {
    const urls = await imageService.fetchImages(word, offset);
    res.json({ urls });
  } catch (err) {
    next(err);
  }
}

async function tts(req, res, next) {
  const sanitize = (val) => {
    const kept = (val || '').match(/[\u4e00-\u9fff0-9]+/g);
    return kept ? kept.join('') : '';
  };
  const { text, voice } = req.body || {};
  const cleanText = sanitize(text);
  if (!cleanText) return res.status(400).json({ error: 'Text is required' });
  try {
    const user = await userModel.findById(req.user.id);
    const data = await ttsService.synthesize(cleanText, {
      voice,
      azureKey: user?.azure_key,
      azureRegion: user?.azure_region,
      azureVoice: user?.azure_voice,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getImages,
  tts,
};
