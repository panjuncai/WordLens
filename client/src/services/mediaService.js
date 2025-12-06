import api from '../api';

// 保留中/英/法字母与数字，去除其他符号，保持词之间的间隔
const sanitizeText = (value) => {
  const kept = (value || '').match(/[A-Za-zÀ-ÖØ-öø-ÿ\u4e00-\u9fff0-9]+/g);
  return kept ? kept.join(' ') : '';
};

export const tts = (text, voice) => api.post('/api/tts', { text: sanitizeText(text), voice });

export const fetchImages = (word, offset = 0) => api.get('/api/images', { params: { word, offset } });
