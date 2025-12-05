import { useState } from 'react';
import { message } from 'antd';
import { fetchImages } from '../services/mediaService';

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

  const loadImages = async (word, refresh = false) => {
    const key = word.toLowerCase();
    const current = imageMap[key] || {};
    if (current.loading) return;
    const nextPage = refresh ? (current.page || 0) + 1 : current.page || 0;
    if (!refresh && current.urls) return;
    setImageMap((prev) => ({
      ...prev,
      [key]: { ...prev[key], loading: true, error: null, page: nextPage },
    }));
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
  };

  const prefetchImages = async (words) => {
    if (!words.length) {
      message.info('暂无可缓存的图片词汇');
      return;
    }
    setPrefetching(true);
    setPrefetchProgress({ done: 0, total: words.length });
    try {
      for (let i = 0; i < words.length; i += 1) {
        const w = words[i];
        // eslint-disable-next-line no-await-in-loop
        await loadImages(w);
        setPrefetchProgress({ done: i + 1, total: words.length });
      }
      message.success('图片缓存完成');
    } catch (error) {
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
