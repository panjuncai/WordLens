import api from '../api';

export const tts = (text, voice) => api.post('/api/tts', { text, voice });

export const fetchImages = (word, offset = 0) => api.get('/api/images', { params: { word, offset } });
