import { useRef } from 'react';
import { message } from 'antd';
import { tts } from '../services/mediaService';

export default function useTtsAudio() {
  const audioCache = useRef({});

  const sanitizeText = (text) => (text || '')
    .replace(/\u00a0/g, ' ') // nbsp -> space
    .replace(/\s+/g, ' ')
    .trim();

  const ensureAudio = async (word, voice) => {
    const normalized = sanitizeText(word);
    if (!normalized) throw new Error('文本为空，无法生成音频');
    const key = `${voice || ''}:${normalized.toLowerCase()}`;
    if (audioCache.current[key]) return audioCache.current[key];
    const { data } = await tts(normalized, voice);
    if (!data?.audioBase64) throw new Error('未收到音频，请检查 Azure 配置');
    const url = `data:${data.format || 'audio/mp3'};base64,${data.audioBase64}`;
    audioCache.current[key] = url;
    return url;
  };

  const playAudioUrl = (url) => new Promise((resolve) => {
    const audio = new Audio(url);
    audio.onended = resolve;
    audio.onerror = resolve;
    audio.play();
  });

  const playWord = async (word, times = 1, voice) => {
    const normalized = sanitizeText(word);
    if (!normalized) return;
    try {
      const url = await ensureAudio(normalized, voice);
      for (let i = 0; i < times; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await playAudioUrl(url);
      }
    } catch (error) {
      const detail = error.response?.data?.message || error.response?.data?.error || error.message;
      const status = error.response?.status;
      message.error(`调用 Azure TTS 失败${status ? ` (${status})` : ''}${detail ? `: ${detail}` : ''}`);
      throw error;
    }
  };

  return { playWord, ensureAudio, audioCache };
}
