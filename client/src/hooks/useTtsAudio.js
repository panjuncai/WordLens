import { useCallback, useRef } from 'react';
import { message } from 'antd';
import { tts } from '../services/mediaService';

export default function useTtsAudio() {
  const audioCache = useRef({});
  const audioRef = useRef(null);
  const pendingResolverRef = useRef(null);
  const playbackTokenRef = useRef(0);

  const sanitizeText = (text) => (text || '')
    .replace(/\u00a0/g, ' ') // nbsp -> space
    .replace(/\s+/g, ' ')
    .trim();

  const cleanupAudio = () => {
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
    }
    audioRef.current = null;
  };

  const stop = useCallback(() => {
    playbackTokenRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      cleanupAudio();
    }
    if (pendingResolverRef.current) {
      const resolver = pendingResolverRef.current;
      pendingResolverRef.current = null;
      resolver();
    }
  }, []);

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
    cleanupAudio();
    const audio = new Audio(url);
    audioRef.current = audio;
    const finalize = () => {
      if (pendingResolverRef.current === resolve) {
        pendingResolverRef.current = null;
      }
      cleanupAudio();
      resolve();
    };
    pendingResolverRef.current = resolve;
    audio.onended = finalize;
    audio.onerror = finalize;
    audio.play().catch(finalize);
  });

  const playWord = async (word, times = 1, voice) => {
    const normalized = sanitizeText(word);
    if (!normalized) return;
    const playbackToken = playbackTokenRef.current + 1;
    playbackTokenRef.current = playbackToken;
    try {
      const url = await ensureAudio(normalized, voice);
      for (let i = 0; i < times; i += 1) {
        if (playbackTokenRef.current !== playbackToken) break;
        await playAudioUrl(url);
        if (playbackTokenRef.current !== playbackToken) break;
      }
    } catch (error) {
      const detail = error.response?.data?.message || error.response?.data?.error || error.message;
      const status = error.response?.status;
      message.error(`调用 Azure TTS 失败${status ? ` (${status})` : ''}${detail ? `: ${detail}` : ''}`);
      throw error;
    }
  };

  return {
    playWord,
    ensureAudio,
    audioCache,
    stop,
  };
}
