import api from '../api';

const sanitizeText = (value) => {
  const kept = (value || '').match(/[\u4e00-\u9fff0-9]+/g);
  return kept ? kept.join('') : '';
};

export const tts = (text, voice) => api.post('/api/tts', { text: sanitizeText(text), voice });

export const fetchImages = (word, offset = 0) => api.get('/api/images', { params: { word, offset } });
