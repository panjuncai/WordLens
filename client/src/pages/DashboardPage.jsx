import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, message,Button } from 'antd';
import ReactMarkdown from 'react-markdown';
import HeroSection from '../components/HeroSection';
import ArticleList from '../components/ArticleList';
import ExerciseBoard from '../components/ExerciseBoard';
import ImageCarousel from '../components/ImageCarousel';
import ConfigModal from '../components/ConfigModal';
import useTtsAudio from '../hooks/useTtsAudio';
import useImageSearch from '../hooks/useImageSearch';
import useArticles from '../hooks/useArticles';
import useExerciseStore from '../stores/useExerciseStore';
import useConfigStore from '../stores/useConfigStore';
import useAuthStore from '../stores/useAuthStore';
import api from '../api';
import { CAROUSEL_INTERVAL, DEFAULT_CN_VOICE, MAX_AUTOPLAY_COUNT } from '../constants/config';

const markdownComponents = {
  p: ({ children, ...props }) => <span {...props}>{children}</span>,
  strong: ({ children, ...props }) => <strong {...props}>{children}</strong>,
  em: ({ children, ...props }) => <em {...props}>{children}</em>,
  code: ({ children, ...props }) => (
    <code className="md-inline-code" {...props}>
      {children}
    </code>
  ),
  a: ({ children, href, ...props }) => (
    <a href={href} target="_blank" rel="noreferrer" {...props}>
      {children}
    </a>
  ),
  ul: ({ children, ...props }) => (
    <ul className="md-list" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="md-list" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => <li {...props}>{children}</li>,
  br: () => <br />,
};

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const [configOpen, setConfigOpen] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [loadingWord, setLoadingWord] = useState('');
  const [prefetching, setPrefetching] = useState(false);
  const [prefetchProgress, setPrefetchProgress] = useState({ done: 0, total: 0 });
  const [prefetchingCn, setPrefetchingCn] = useState(false);
  const [prefetchProgressCn, setPrefetchProgressCn] = useState({ done: 0, total: 0 });
  const [activeArticle, setActiveArticle] = useState(null);
  const [pendingArticleId, setPendingArticleId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [contentError, setContentError] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [previewSrc, setPreviewSrc] = useState('');
  const [previewList, setPreviewList] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const computeDefaultCarouselPos = () => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const h = typeof window !== 'undefined' ? window.innerHeight : 800;
    const cardW = 520;
    const cardH = 260;
    return {
      x: Math.max(20, w - 100 - cardW),
      y: Math.max(20, h / 2 - cardH / 2),
    };
  };
  const [carouselPos, setCarouselPos] = useState(() => computeDefaultCarouselPos());
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  const updateUrl = (articleId) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (articleId) {
      params.set('article', articleId);
    } else {
      params.delete('article');
    }
    const search = params.toString();
    const next = `${window.location.pathname}${search ? `?${search}` : ''}`;
    window.history.replaceState(null, '', next);
  };
  const [carouselState, setCarouselState] = useState({
    word: '',
    urls: [],
    index: 0,
    visible: false,
    loading: false,
  });
  const inputRefs = useRef({});
  const carouselRef = useRef(null);
  const playbackRef = useRef({ cancelled: false });
  const { playWord, ensureAudio, audioCache, stop: stopAudio } = useTtsAudio();

  const cancelCurrentPlayback = useCallback((preserveActive = false) => {
    if (playbackRef.current) {
      playbackRef.current.cancelled = true;
      playbackRef.current.paused = false;
    }
    stopAudio();
    setIsPlaying(false);
    setIsPaused(false);
    if (!preserveActive) {
      setActiveIndex(-1);
    }
  }, [stopAudio]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('article');
    if (id) {
      setPendingArticleId(id);
    }
  }, []);

  useEffect(() => () => cancelCurrentPlayback(), [cancelCurrentPlayback]);

  // fine-grained subscriptions to避免 getSnapshot警告
  const sceneText = useExerciseStore((state) => state.sceneText);
  const selectedWords = useExerciseStore((state) => state.selectedWords);
  const segments = useExerciseStore((state) => state.segments);
  const showCloze = useExerciseStore((state) => state.showCloze);
  const answers = useExerciseStore((state) => state.answers);
  const statuses = useExerciseStore((state) => state.statuses);
  const wordListOpen = useExerciseStore((state) => state.wordListOpen);
  const revealedIds = useExerciseStore((state) => state.revealedIds);

  const loadArticle = useExerciseStore((state) => state.loadArticle);
  const extractWords = useExerciseStore((state) => state.extractWords);
  const resetCloze = useExerciseStore((state) => state.resetCloze);
  const setAnswer = useExerciseStore((state) => state.setAnswer);
  const setStatus = useExerciseStore((state) => state.setStatus);
  const toggleWordList = useExerciseStore((state) => state.toggleWordList);
  const setRevealedIds = useExerciseStore((state) => state.setRevealedIds);

  const autoCarousel = useConfigStore((state) => state.autoCarousel);
  const blurWords = useConfigStore((state) => state.blurWords);
  const accentCheck = useConfigStore((state) => state.accentCheck);
  const autoPlayCount = useConfigStore((state) => state.autoPlayCount);
  const azureKey = useConfigStore((state) => state.azureKey);
  const azureRegion = useConfigStore((state) => state.azureRegion);
  const azureVoice = useConfigStore((state) => state.azureVoice);
  const setAutoCarousel = useConfigStore((state) => state.setAutoCarousel);
  const setBlurWords = useConfigStore((state) => state.setBlurWords);
  const setAccentCheck = useConfigStore((state) => state.setAccentCheck);
  const setAutoPlayCount = useConfigStore((state) => state.setAutoPlayCount);
  const setAzureKey = useConfigStore((state) => state.setAzureKey);
  const setAzureRegion = useConfigStore((state) => state.setAzureRegion);
  const setAzureVoice = useConfigStore((state) => state.setAzureVoice);
  const themeMode = useConfigStore((state) => state.themeMode);
  const setThemeMode = useConfigStore((state) => state.setThemeMode);

  const {
    imageMap,
    loadImages,
    prefetchImages: prefetchImagesAll,
    prefetching: imagePrefetching,
    prefetchProgress: imagePrefetchProgress,
  } = useImageSearch();
  const imageMapRef = useRef({});
  useEffect(() => {
    imageMapRef.current = imageMap;
  }, [imageMap]);
  const {
    items: articles,
    loading: articlesLoading,
    saving: articlesSaving,
    createItem: createArticle,
    updateItem: updateArticle,
    deleteItem: deleteArticle,
    fetchItem,
  } = useArticles(!!user);

  const blanks = useMemo(() => segments.filter((seg) => seg.role === 'blank'), [segments]);
  const clampedCount = Math.min(MAX_AUTOPLAY_COUNT, Math.max(0, autoPlayCount || 0));

  const renderMarkdown = (value) => (
    <span className="markdown-text">
      <ReactMarkdown components={markdownComponents}>{value || ''}</ReactMarkdown>
    </span>
  );

  const copyArticle = async () => {
    try {
      await navigator.clipboard.writeText(sceneText || '');
      message.success('全文已复制');
    } catch {
      message.error('复制失败，请检查浏览器权限');
    }
  };

  const fetchImages = useCallback(async (word, refresh = false) => {
    const key = word.toLowerCase();
    const current = imageMap[key] || {};
    setCarouselState((prev) => {
      if (prev.word.toLowerCase() === key) return { ...prev, loading: true };
      return prev;
    });
    try {
      const urls = await loadImages(word, refresh);
      const nextUrls = urls || current.urls || [];
      setCarouselState((prev) => {
        if (prev.word.toLowerCase() === key) {
          return {
            ...prev,
            urls: nextUrls,
            loading: false,
            index: 0,
            visible: autoCarousel,
          };
        }
        return prev;
      });
    } catch {
      setCarouselState((prev) => {
        if (prev.word.toLowerCase() === key) {
          return { ...prev, loading: false, urls: current.urls || prev.urls || [] };
        }
        return prev;
      });
    }
  }, [autoCarousel, imageMap, loadImages]);

  useEffect(() => {
    if (user) {
      loadConfig();
    } else {
      setAzureKey('');
      setAzureRegion('');
      setAzureVoice('');
    }
  }, [user]);

  useEffect(() => {
    if (!activeArticle) return;
    if (activeArticle.content) {
      loadArticle(activeArticle.content);
      setCreating(false);
      updateUrl(activeArticle.id);
      return;
    }
    (async () => {
      const detail = await fetchItem(activeArticle.id);
      if (detail) {
        setActiveArticle(detail);
      }
    })();
  }, [activeArticle]);

  useEffect(() => {
    inputRefs.current = {};
    cancelCurrentPlayback();
    setPreviewList([]);
    setPreviewIndex(0);
    setCarouselState((prev) => ({ ...prev, visible: false, word: '', urls: [], loading: false }));
  }, [sceneText, selectedWords, cancelCurrentPlayback]);

  useEffect(() => {
    if (!articles.length) {
      setCreating(true);
      setActiveArticle(null);
      updateUrl(null);
      return;
    }
    if (pendingArticleId) {
      const match = articles.find((a) => String(a.id) === String(pendingArticleId));
      if (match) {
        setActiveArticle(match);
        setPendingArticleId(null);
        return;
      }
      setPendingArticleId(null);
    }
    if (!creating && !activeArticle) {
      setActiveArticle(articles[0]);
    }
  }, [articles, activeArticle, creating, pendingArticleId]);

  useEffect(() => {
    if (showCloze) {
      setCarouselState((prev) => ({ ...prev, visible: false }));
    }
  }, [showCloze]);

  useEffect(() => {
    if (!autoCarousel) {
      setCarouselState((prev) => ({ ...prev, visible: false }));
    }
  }, [autoCarousel]);

  useEffect(() => {
    if (!blurWords) {
      setRevealedIds(new Set());
    }
  }, [blurWords]);

  useEffect(() => {
    if (!carouselState.visible || carouselState.urls.length <= 1) return () => {};
    const timer = setInterval(() => {
      setCarouselState((prev) => ({
        ...prev,
        index: prev.urls.length ? (prev.index + 1) % prev.urls.length : 0,
      }));
    }, CAROUSEL_INTERVAL);
    return () => clearInterval(timer);
  }, [carouselState.visible, carouselState.urls]);

  useEffect(() => {
    const handleMove = (e) => {
      if (!draggingRef.current) return;
      setCarouselPos({
        x: e.clientX - dragOffsetRef.current.x,
        y: e.clientY - dragOffsetRef.current.y,
      });
    };
    const handleUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  useEffect(() => {
    if (!previewSrc) return () => {};
    const handleKey = (e) => {
      if (!previewList.length) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPreviewIndex((idx) => (idx + 1) % previewList.length);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPreviewIndex((idx) => (idx - 1 + previewList.length) % previewList.length);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [previewSrc, previewList]);

  const openImagesForWord = useCallback((word) => {
    if (showCloze || !autoCarousel) return;
    const key = word.toLowerCase();
    const entry = imageMapRef.current[key];
    setCarouselState((prev) => {
      const sameWord = prev.word?.toLowerCase() === key;
      const hasUrls = entry?.urls?.length;
      if (sameWord && prev.visible && hasUrls) {
        return prev;
      }
      return {
        word,
        urls: entry?.urls || [],
        index: 0,
        visible: true,
        loading: !entry?.urls?.length,
      };
    });
    if (!entry?.urls?.length) {
      fetchImages(word);
    }
  }, [autoCarousel, fetchImages, showCloze]);

  const handleChunkPlay = useCallback(async (targetIndex, options = {}) => {
    if (!segments.length) return;
    const startIdx = segments.findIndex((seg) => seg.index === targetIndex);
    if (startIdx === -1) return;
    const {
      continuous = false,
      repeat,
      triggerPreview = true,
      triggerReveal = true,
    } = options;
    cancelCurrentPlayback(true);
    const controller = { cancelled: false, paused: false };
    playbackRef.current = controller;
    if (continuous) {
      setIsPlaying(true);
      setIsPaused(false);
    }
    let idx = startIdx;
    while (idx < segments.length) {
      if (controller.cancelled) break;
      if (controller.paused) break;
      const chunk = segments[idx];
      if (!chunk) break;
      setActiveIndex(chunk.index);
      const textValue = (chunk.value || '').trim();
      const playable = textValue && chunk.type !== 'punct';
      if (playable) {
        const playTimes = typeof repeat === 'number'
          ? repeat
          : continuous
            ? 1
            : chunk.role === 'blank'
              ? Math.max(1, clampedCount)
              : 1;
        const voice = chunk.type === 'fr' ? azureVoice : DEFAULT_CN_VOICE;
        try {
          // eslint-disable-next-line no-await-in-loop
          await playWord(textValue, playTimes, voice);
        } catch (error) {
          controller.cancelled = true;
          break;
        }
        if (controller.paused || controller.cancelled) break;
        if (!continuous && triggerPreview && !showCloze && chunk.type === 'fr') {
          openImagesForWord(textValue);
        }
        if (!continuous && triggerReveal && blurWords && !showCloze && chunk.role === 'blank') {
          setRevealedIds((prev) => {
            const next = new Set(prev);
            if (next.has(chunk.id)) {
              next.delete(chunk.id);
            } else {
              next.add(chunk.id);
            }
            return next;
          });
        }
      }
      if (!continuous) break;
      idx += 1;
    }
    if (controller.paused) return;
    if (controller.cancelled) return;
    if (continuous) {
      setIsPlaying(false);
      setIsPaused(false);
    }
    setActiveIndex(-1);
  }, [
    segments,
    cancelCurrentPlayback,
    clampedCount,
    azureVoice,
    playWord,
    showCloze,
    openImagesForWord,
    blurWords,
    setRevealedIds,
  ]);

  const moveActive = useCallback((delta) => {
    if (!segments.length) return;
    const currentIdx = segments.findIndex((seg) => seg.index === activeIndex);
    const targetIdx = currentIdx === -1
      ? (delta > 0 ? 0 : segments.length - 1)
      : Math.max(0, Math.min(segments.length - 1, currentIdx + delta));
    const target = segments[targetIdx];
    if (target) {
      handleChunkPlay(target.index, { triggerPreview: true, triggerReveal: true });
    }
  }, [activeIndex, handleChunkPlay, segments]);
  const togglePausePlayback = useCallback(() => {
    if (!isPlaying || !playbackRef.current) return;
    const controller = playbackRef.current;
    if (!isPaused) {
      controller.paused = true;
      controller.resumeIndex = activeIndex;
      stopAudio();
      setIsPaused(true);
      return;
    }
    const resumeIndex = (typeof activeIndex === 'number' && activeIndex >= 0)
      ? activeIndex
      : controller.resumeIndex ?? segments[0]?.index;
    if (typeof resumeIndex !== 'number') return;
    setIsPaused(false);
    handleChunkPlay(resumeIndex, { continuous: true, triggerPreview: false, triggerReveal: false });
  }, [activeIndex, handleChunkPlay, isPaused, isPlaying, segments, stopAudio]);

  const onExtract = () => {
    const count = extractWords();
    if (!count) {
      message.warning('未找到可挖空的法语候选词，请检查文本');
      return;
    }
    // message.success(`已提取 ${count} 个候选词并完成挖空`);
  };

  const onReset = () => {
    resetCloze();
    const first = blanks[0];
    if (first) {
      handleChunkPlay(first.index, { repeat: clampedCount, triggerPreview: true, triggerReveal: true });
    }
    // message.info('已恢复为原文');
  };

  const onPlay = async (word) => {
    setLoadingWord(word);
    try {
      await playWord(word);
    } catch {
      // handled inside hook
    } finally {
      setLoadingWord('');
    }
  };

  const handleChange = (id, val) => {
    setAnswer(id, val);
  };

  const handleEnter = (item) => {
    const inputVal = (answers[item.id] || '').trim();
    const sensitivity = accentCheck ? 'accent' : 'base';
    const correct = inputVal.localeCompare(item.value, undefined, { sensitivity, usage: 'search' }) === 0;
    if (correct && !accentCheck && inputVal !== item.value) {
      setAnswer(item.id, item.value);
    }
    setStatus(item.id, correct ? 'correct' : 'wrong');
    if (correct) {
      const idx = blanks.findIndex((seg) => seg.id === item.id);
      const next = blanks[idx + 1];
      if (next) {
        setTimeout(() => inputRefs.current[next.id]?.focus(), 10);
      }
    } else {
      setTimeout(() => inputRefs.current[item.id]?.focus(), 10);
    }
  };

  const handleKeyDown = (e, item) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEnter(item);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const idx = blanks.findIndex((seg) => seg.id === item.id);
      const next = blanks[idx + (e.shiftKey ? -1 : 1)];
      if (next) {
        setTimeout(() => inputRefs.current[next.id]?.focus(), 10);
      }
    }
  };

  const onKeyNavigate = (e) => {
    if (showCloze || !segments.length || (isPlaying && !isPaused)) return;
    if (['ArrowRight', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      moveActive(1);
    } else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      moveActive(-1);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      moveActive(e.shiftKey ? -1 : 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = segments.find((seg) => seg.index === activeIndex) || segments[0];
      if (current) {
        handleChunkPlay(current.index, { triggerPreview: true, triggerReveal: true });
      }
    }
  };

  const prefetchAudio = async () => {
    const blankWords = segments.filter((seg) => seg.role === 'blank');
    const uniqueWords = Array.from(new Set(blankWords.map((b) => b.value)));
    const pending = uniqueWords.filter((w) => !audioCache.current?.[`${azureVoice || ''}:${w.toLowerCase()}`]);
    if (!pending.length) {
      message.info('外语音频已全部缓存');
      message.info('暂无可缓存的挖空词');
      return;
    }
    setPrefetching(true);
    setPrefetchProgress({ done: 0, total: pending.length });
    try {
      for (let i = 0; i < pending.length; i += 1) {
        const word = pending[i];
        // eslint-disable-next-line no-await-in-loop
        await ensureAudio(word, azureVoice);
        setPrefetchProgress({ done: i + 1, total: pending.length });
      }
      message.success('音频已缓存完成');
    } catch (error) {
      const detail = error.response?.data?.message || error.message;
      message.error(`缓存失败：${detail}`);
    } finally {
      setPrefetching(false);
    }
  };

  const prefetchChinese = async () => {
    const segs = segments
      .filter((seg) => seg.type === 'cn')
      .map((seg) => (seg.value || '').trim())
      .filter(Boolean);
    const unique = Array.from(new Set(segs));
    const pending = unique.filter((t) => !audioCache.current?.[`${DEFAULT_CN_VOICE}:${t.toLowerCase()}`]);
    if (!pending.length) {
      message.info('中文音频已全部缓存');
      message.info('暂无可缓存的中文片段');
      return;
    }
    setPrefetchingCn(true);
    setPrefetchProgressCn({ done: 0, total: pending.length });
    try {
      for (let i = 0; i < pending.length; i += 1) {
        const text = pending[i];
        // eslint-disable-next-line no-await-in-loop
        await ensureAudio(text, DEFAULT_CN_VOICE);
        setPrefetchProgressCn({ done: i + 1, total: pending.length });
      }
      message.success('中文片段已缓存完成');
    } catch (error) {
      const detail = error.response?.data?.message || error.message;
      message.error(`中文缓存失败：${detail}`);
    } finally {
      setPrefetchingCn(false);
    }
  };

  const readFullText = useCallback(() => {
    if (!segments.length) return;
    const startIndex = typeof activeIndex === 'number' && activeIndex >= 0
      ? activeIndex
      : segments[0]?.index;
    if (typeof startIndex !== 'number') return;
    handleChunkPlay(startIndex, { continuous: true, triggerPreview: false, triggerReveal: false });
  }, [activeIndex, handleChunkPlay, segments]);

  const startCreate = () => {
    setCreating(true);
    setActiveArticle(null);
    setNewContent('');
    setCarouselState((prev) => ({ ...prev, visible: false }));
    setPendingArticleId(null);
    updateUrl(null);
  };

  const saveCreate = async () => {
    const trimmed = newContent.trim();
    if (!trimmed) {
      setContentError('请填写内容');
      return;
    }
    if (trimmed.length > 20) {
      setContentError('不能超过20个字符');
      return;
    }
    setContentError('');
    const computedTitle = trimmed.split(/\s+/)[0] || '未命名';
    const created = await createArticle(computedTitle, newContent);
    if (created) {
      setActiveArticle(created);
      setCreating(false);
      setNewContent('');
      setContentError('');
    }
  };

  const handleDeleteArticle = async (id) => {
    await deleteArticle(id);
    const remaining = articles.filter((a) => a.id !== id);
    if (remaining.length) {
      setActiveArticle(remaining[0]);
      setCreating(false);
      updateUrl(remaining[0].id);
    } else {
      setActiveArticle(null);
      setCreating(true);
      updateUrl(null);
    }
  };

  const nextSlide = () => {
    setCarouselState((prev) => {
      if (!prev.urls.length) return prev;
      return { ...prev, index: (prev.index + 1) % prev.urls.length };
    });
  };

  const prevSlide = () => {
    setCarouselState((prev) => {
      if (!prev.urls.length) return prev;
      return { ...prev, index: (prev.index - 1 + prev.urls.length) % prev.urls.length };
    });
  };

  const handleCarouselWheel = (e) => {
    if (!carouselState.visible) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (delta > 0) {
      nextSlide();
    } else if (delta < 0) {
      prevSlide();
    }
  };

  const prefetchImages = async () => {
    const words = Array.from(new Set(selectedWords));
    await prefetchImagesAll(words);
  };

  const handleCarouselDragStart = (e) => {
    if (e.target.closest('button') || e.target.tagName === 'IMG') return;
    const rect = e.currentTarget.getBoundingClientRect();
    dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    draggingRef.current = true;
  };

  useEffect(() => {
    if (!autoCarousel) {
      setCarouselPos(computeDefaultCarouselPos());
    }
  }, [autoCarousel]);

  const loadConfig = async () => {
    try {
      const { data } = await api.get('/api/user/config');
      setAzureKey(data.azure_key || '');
      setAzureRegion(data.azure_region || '');
      setAzureVoice(data.azure_voice || '');
    } catch {
      message.error('加载配置失败');
    }
  };

  const saveConfig = async () => {
    setConfigLoading(true);
    try {
      await api.put('/api/user/config', {
        azure_key: azureKey,
        azure_region: azureRegion,
        azure_voice: azureVoice,
      });
      message.success('配置已保存');
      setConfigOpen(false);
    } catch {
      message.error('保存失败');
    } finally {
      setConfigLoading(false);
    }
  };

  return (
    <>
      <ImageCarousel
        visible={autoCarousel && carouselState.visible}
        state={carouselState}
        position={carouselPos}
        onClose={() => setCarouselState((prev) => ({ ...prev, visible: false }))}
        onNext={nextSlide}
        onPrev={prevSlide}
        onRefresh={(word) => fetchImages(word, true)}
        onWheel={handleCarouselWheel}
        onPreview={(urls, idx) => {
          setPreviewList(urls);
          setPreviewIndex(idx);
          setPreviewSrc(urls[idx]);
        }}
        innerRef={carouselRef}
        onDragStart={handleCarouselDragStart}
      />

      <div className="app-layout">
        <aside
          className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}
          style={{ width: sidebarCollapsed ? 60 : 280, minWidth: sidebarCollapsed ? 60 : 240 }}
        >
          <ArticleList
            items={articles}
            loading={articlesLoading}
            saving={articlesSaving}
            onCreate={createArticle}
            onCreateStart={startCreate}
            onUpdate={updateArticle}
            onDelete={handleDeleteArticle}
            onSelect={(item) => {
              setCreating(false);
              setActiveArticle(item);
              updateUrl(item.id);
            }}
            activeId={activeArticle?.id}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
            userEmail={user?.email || ''}
            themeMode={themeMode}
            onToggleTheme={setThemeMode}
            onOpenConfig={() => {
              setConfigOpen(true);
              loadConfig();
            }}
            onLogout={logout}
            fetchItem={fetchItem}
            onLogoClick={startCreate}
          />
        </aside>

        <main className="app-main">
          {!creating && (
            <div className="main-header">
              <div className="content-container header-container">
                <HeroSection
                  onExtract={onExtract}
                  onReset={onReset}
                  showCloze={showCloze}
                  onReadAll={readFullText}
                  readingAll={isPlaying && !isPaused}
                  onTogglePause={togglePausePlayback}
                  isPlaying={isPlaying}
                  isPaused={isPaused}
                  autoPlayCount={autoPlayCount}
                  setAutoPlayCount={setAutoPlayCount}
                  prefetchAudio={prefetchAudio}
                  prefetching={prefetching}
                  prefetchProgress={prefetchProgress}
                  prefetchChinese={prefetchChinese}
                  prefetchingCn={prefetchingCn}
                  prefetchProgressCn={prefetchProgressCn}
                  prefetchImages={prefetchImages}
                  imagePrefetching={imagePrefetching}
                  imagePrefetchProgress={imagePrefetchProgress}
                  autoCarousel={autoCarousel}
                  blurWords={blurWords}
                  accentCheck={accentCheck}
                  setAutoCarousel={setAutoCarousel}
                  setBlurWords={setBlurWords}
                  setAccentCheck={setAccentCheck}
                />
              </div>
            </div>
            // <></>
          )}
          <div className="main-scroll-area">
            <div className="content-container">
              {creating || (!activeArticle && !articles.length) ? (
                <div className="article-panel">
                  <div className="new-article-shell">
                    <form
                      className="new-article-form bubble-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveCreate();
                      }}
                    >
                      <div className="bubble-heading">想场景化背单词吗？</div>
                      <div className="bubble-body">
                        <textarea
                          className={`bubble-input body-input ${contentError ? 'input-error' : ''}`}
                          placeholder="输入场景文章..."
                          rows={4}
                          value={newContent}
                          onChange={(e) => {
                            setNewContent(e.target.value);
                            if (e.target.value.trim().length > 20) {
                              setContentError('不能超过20个字符');
                            } else {
                              setContentError('');
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              e.preventDefault();
                              saveCreate();
                            }
                          }}
                        />
                        {contentError && <div className="input-error-text">{contentError}</div>}
                        <div className="bubble-actions">
                          <Button
                            className="bubble-send"
                            htmlType="submit"
                            type="primary"
                            shape="circle"
                            icon={<span style={{ fontWeight: 700 }}>{'>'}</span>}
                            loading={articlesSaving}
                          />
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="article-panel">
                  <ExerciseBoard
                    segments={segments}
                    statuses={statuses}
                    answers={answers}
                    showCloze={showCloze}
                    wordListOpen={wordListOpen}
                  selectedWords={selectedWords}
                  blurWords={blurWords}
                  revealedIds={revealedIds}
                  activeIndex={activeIndex}
                  onToggleWordList={toggleWordList}
                  onInputChange={handleChange}
                  onInputKeyDown={handleKeyDown}
                  onInputFocus={(item) => {
                    handleChunkPlay(item.index, {
                      repeat: clampedCount,
                      triggerPreview: false,
                      triggerReveal: false,
                    });
                  }}
                  onChunkActivate={(segment) => {
                    handleChunkPlay(segment.index, { triggerPreview: true, triggerReveal: true });
                  }}
                  onKeyNavigate={onKeyNavigate}
                  imageMap={imageMap}
                  fetchImages={fetchImages}
                  onPlay={onPlay}
                  loadingWord={loadingWord}
                  renderMarkdown={renderMarkdown}
                  onCopyArticle={copyArticle}
                  registerInputRef={(id, el) => {
                    if (el) {
                      inputRefs.current[id] = el;
                    } else {
                      delete inputRefs.current[id];
                    }
                  }}
                  onPreview={(urls, idx) => {
                      setPreviewList(urls);
                      setPreviewIndex(idx);
                      setPreviewSrc(urls[idx]);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <ConfigModal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        onSave={saveConfig}
        loading={configLoading}
        azureKey={azureKey}
        azureRegion={azureRegion}
        azureVoice={azureVoice}
        setAzureKey={setAzureKey}
        setAzureRegion={setAzureRegion}
        setAzureVoice={setAzureVoice}
      />

      <Modal
        open={!!previewSrc}
        footer={null}
        onCancel={() => {
          setPreviewSrc('');
          setPreviewList([]);
          setPreviewIndex(0);
        }}
        centered
        closable={false}
        maskClosable
        width="fit-content"
        styles={{
          body: { padding: 0 },
          content: { width: 'fit-content' },
        }}
        destroyOnHidden
      >
        <img
          src={previewList[previewIndex] || previewSrc}
          alt="预览"
          style={{ display: 'block', maxWidth: '80vw', maxHeight: '80vh', objectFit: 'contain' }}
        />
      </Modal>
    </>
  );
}
