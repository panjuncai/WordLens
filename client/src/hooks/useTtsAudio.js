import { useCallback, useEffect, useRef } from 'react';
import { message } from 'antd';
import { tts } from '../services/mediaService';

export default function useTtsAudio() {
  const audioCache = useRef({});
  const audioRef = useRef(null);
  const pendingResolverRef = useRef(null);
  const playbackTokenRef = useRef(0);
  const CACHE_KEY = 'wordlens-audio-cache';

  const sanitizeText = (text) => (text || '')
    .replace(/\u00a0/g, ' ') // nbsp -> space
    .replace(/\s+/g, ' ')
    .trim();

  const sanitizeForTts = (text) => {
    const normalized = sanitizeText(text);
    if (!normalized) return '';
    const hasCjk = /[\u4E00-\u9FFF]/.test(normalized);
    const hasLatin = /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(normalized);
    if (hasCjk && !hasLatin) {
      return normalized.replace(/[\s\u00a0]+/g, '');
    }
    return normalized;
  };

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

  const loadCache = useCallback(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }, [CACHE_KEY]);

  const persistCache = useCallback((cache) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
      // ignore quota errors, keep in-memory cache
    }
  }, [CACHE_KEY]);

  useEffect(() => {
    audioCache.current = loadCache();
  }, [loadCache]);

  const ensureAudio = async (word, voice) => {
    const normalized = sanitizeForTts(word);
    if (!normalized) throw new Error('文本为空，无法生成音频');
    const key = `${voice || ''}:${normalized.toLowerCase()}`;
    if (audioCache.current[key]) return audioCache.current[key];
    const { data } = await tts(normalized, voice);
    if (!data?.audioBase64) throw new Error('未收到音频，请检查 Azure 配置');
    const url = `data:${data.format || 'audio/mp3'};base64,${data.audioBase64}`;
    audioCache.current[key] = url;
    persistCache(audioCache.current);
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

  const playWord = async (word, times = 1, voice, options = {}) => {
    const normalized = sanitizeForTts(word);
    if (!normalized) return;
    const gapMs = Number(options?.gapMs) || 0;
    const playbackToken = playbackTokenRef.current + 1;
    playbackTokenRef.current = playbackToken;
    try {
      const url = await ensureAudio(normalized, voice);
      for (let i = 0; i < times; i += 1) {
        if (playbackTokenRef.current !== playbackToken) break;
        await playAudioUrl(url);
        if (playbackTokenRef.current !== playbackToken) break;
        if (gapMs > 0 && i < times - 1) {
          let remaining = gapMs;
          while (remaining > 0) {
            if (playbackTokenRef.current !== playbackToken) break;
            const step = Math.min(250, remaining);
            await new Promise((resolve) => setTimeout(resolve, step));
            remaining -= step;
          }
        }
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
