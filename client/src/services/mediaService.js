import api from '../api';

// TTS 请求文本清洗：
// - 去掉所有标点/符号（节省 token）
// - 压缩空白
// - 纯中文（无拉丁字母）时去掉所有空白
const sanitizeText = (value) => {
  const normalized = String(value ?? '').replace(/\u00a0/g, ' ');
  const tokens = normalized.match(/[A-Za-z\u00C0-\u024F\u4E00-\u9FFF0-9]+/g) || [];
  const hasCjk = tokens.some((t) => /[\u4E00-\u9FFF]/.test(t));
  const hasLatin = tokens.some((t) => /[A-Za-z\u00C0-\u024F]/.test(t));
  if (hasCjk && !hasLatin) return tokens.join('');
  return tokens.join(' ').replace(/\s+/g, ' ').trim();
};

export const tts = (text, voice) => api.post('/api/tts', { text: sanitizeText(text), voice });

export const fetchImages = (word, offset = 0) => api.get('/api/images', { params: { word, offset } });
