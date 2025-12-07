import { useState, useCallback } from 'react';
import { message } from 'antd';
import { fetchImages } from '../services/mediaService';
import { IMAGE_PREFETCH_CONCURRENCY } from '../constants/config';

export default function useImageSearch() {
  const [imageMap, setImageMap] = useState({});
  const [prefetching, setPrefetching] = useState(false);
  const [prefetchProgress, setPrefetchProgress] = useState({ done: 0, total: 0 });

  const preloadImages = (urls = []) => Promise.all(
    urls.map(
      (src) => new Promise((resolve) => {
        const img = new Image();
        img.onload = img.onerror = resolve;
        img.src = src;
      }),
    ),
  );

  const loadImages = useCallback(async (word, refresh = false) => {
    const key = word.toLowerCase();
    let current = {};
    setImageMap((prev) => {
      current = prev[key] || {};
      const nextPage = refresh ? (current.page || 0) + 1 : current.page || 0;
      if (current.loading) return prev;
      if (!refresh && current.urls) return prev;
      return {
        ...prev,
        [key]: { ...current, loading: true, error: null, page: nextPage },
      };
    });
    const nextPage = refresh ? (current.page || 0) + 1 : current.page || 0;
    if (current.loading || (!refresh && current.urls)) return current.urls;
    try {
      const { data } = await fetchImages(word, nextPage * 5);
      const urls = data?.urls || [];
      setImageMap((prev) => ({
        ...prev,
        [key]: { urls, loading: false, error: null, page: nextPage },
      }));
      preloadImages(urls);
      return urls;
    } catch (error) {
      setImageMap((prev) => ({
        ...prev,
        [key]: {
          urls: prev[key]?.urls || current.urls || [],
          loading: false,
          error: '获取图片失败',
          page: current.page || 0,
        },
      }));
      throw error;
    }
  }, []);

  const prefetchImages = async (words) => {
    if (!words.length) {
      message.info('暂无可缓存的图片词汇');
      return;
    }
    setPrefetching(true);
    setPrefetchProgress({ done: 0, total: words.length });
    try {
      let done = 0;
      for (let i = 0; i < words.length; i += IMAGE_PREFETCH_CONCURRENCY) {
        const chunk = words.slice(i, i + IMAGE_PREFETCH_CONCURRENCY);
        await Promise.all(chunk.map((w) => loadImages(w).catch(() => {})));
        done += chunk.length;
        setPrefetchProgress({ done: Math.min(done, words.length), total: words.length });
      }
      message.success('图片缓存完成');
    } catch {
      message.error('图片缓存失败');
    } finally {
      setPrefetching(false);
    }
  };

  return {
    imageMap,
    loadImages,
    prefetchImages,
    prefetching,
    prefetchProgress,
  };
}
