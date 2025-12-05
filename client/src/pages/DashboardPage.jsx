import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, Modal, Typography, message } from 'antd';
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
import useAutoPlay from '../hooks/useAutoPlay';
import {
  CAROUSEL_INTERVAL,
  MAX_AUTOPLAY_COUNT,
  MAX_AUTOPLAY_DELAY,
  MIN_AUTOPLAY_DELAY,
} from '../constants/config';

const { Text } = Typography;

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
  const [activeArticle, setActiveArticle] = useState(null);
  const [activeWordId, setActiveWordId] = useState(null);
  const [previewSrc, setPreviewSrc] = useState('');
  const [previewList, setPreviewList] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [carouselState, setCarouselState] = useState({
    word: '',
    urls: [],
    index: 0,
    visible: false,
    loading: false,
  });
  const inputRefs = useRef({});
  const wordRefs = useRef({});
  const carouselRef = useRef(null);

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
  const autoPlayEnabled = useConfigStore((state) => state.autoPlayEnabled);
  const autoPlayDelay = useConfigStore((state) => state.autoPlayDelay);
  const autoPlayCount = useConfigStore((state) => state.autoPlayCount);
  const azureKey = useConfigStore((state) => state.azureKey);
  const azureRegion = useConfigStore((state) => state.azureRegion);
  const azureVoice = useConfigStore((state) => state.azureVoice);
  const setAutoCarousel = useConfigStore((state) => state.setAutoCarousel);
  const setBlurWords = useConfigStore((state) => state.setBlurWords);
  const setAccentCheck = useConfigStore((state) => state.setAccentCheck);
  const setAutoPlayEnabled = useConfigStore((state) => state.setAutoPlayEnabled);
  const setAutoPlayDelay = useConfigStore((state) => state.setAutoPlayDelay);
  const setAutoPlayCount = useConfigStore((state) => state.setAutoPlayCount);
  const setAzureKey = useConfigStore((state) => state.setAzureKey);
  const setAzureRegion = useConfigStore((state) => state.setAzureRegion);
  const setAzureVoice = useConfigStore((state) => state.setAzureVoice);
  const themeMode = useConfigStore((state) => state.themeMode);
  const setThemeMode = useConfigStore((state) => state.setThemeMode);

  const { playWord, ensureAudio } = useTtsAudio();
  const {
    imageMap,
    loadImages,
    prefetchImages: prefetchImagesAll,
    prefetching: imagePrefetching,
    prefetchProgress: imagePrefetchProgress,
  } = useImageSearch();
  const {
    items: articles,
    loading: articlesLoading,
    saving: articlesSaving,
    createItem: createArticle,
    updateItem: updateArticle,
    deleteItem: deleteArticle,
  } = useArticles(!!user);

  const blanks = useMemo(() => segments.filter((seg) => seg.type === 'blank'), [segments]);
  const clampedCount = Math.min(MAX_AUTOPLAY_COUNT, Math.max(0, autoPlayCount || 0));
  const clampedDelay = Math.min(MAX_AUTOPLAY_DELAY, Math.max(MIN_AUTOPLAY_DELAY, autoPlayDelay || MIN_AUTOPLAY_DELAY));

  const renderMarkdown = (value) => (
    <span className="markdown-text">
      <ReactMarkdown components={markdownComponents}>{value || ''}</ReactMarkdown>
    </span>
  );

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
    if (activeArticle) {
      loadArticle(activeArticle.content);
    }
  }, [activeArticle]);

  useEffect(() => {
    inputRefs.current = {};
    wordRefs.current = {};
    setActiveWordId(null);
    setPreviewList([]);
    setPreviewIndex(0);
    setCarouselState((prev) => ({ ...prev, visible: false, word: '', urls: [], loading: false }));
  }, [sceneText, selectedWords]);

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

  const triggerAutoPlay = useCallback(async (word) => {
    if (!clampedCount) return;
    try {
      await playWord(word, clampedCount);
    } catch (error) {
      console.error('Auto play failed', error);
    }
  }, [clampedCount, playWord]);

  const openImagesForWord = useCallback((word, id = null) => {
    if (showCloze) return;
    const key = word.toLowerCase();
    const entry = imageMap[key];
    setCarouselState({
      word,
      urls: entry?.urls || [],
      index: 0,
      visible: autoCarousel,
      loading: !entry?.urls?.length,
    });
    fetchImages(word);
    if (id !== null) {
      setActiveWordId(id);
    }
  }, [autoCarousel, fetchImages, imageMap, showCloze]);

  const moveActive = useCallback((delta) => {
    if (!blanks.length) return;
    const idx = blanks.findIndex((b) => b.id === activeWordId);
    const nextIdx = idx === -1 ? 0 : Math.max(0, Math.min(blanks.length - 1, idx + delta));
    const target = blanks[nextIdx];
    if (target) {
      setActiveWordId(target.id);
      if (!autoPlayEnabled) {
        triggerAutoPlay(target.value);
      }
      if (!showCloze) {
        openImagesForWord(target.value, target.id);
      }
      setTimeout(() => {
        const el = wordRefs.current[target.id];
        if (el?.focus) el.focus();
      }, 0);
    }
  }, [activeWordId, autoPlayEnabled, blanks, openImagesForWord, showCloze, triggerAutoPlay]);

  useAutoPlay({
    activeWordId,
    blanks,
    enabled: autoPlayEnabled,
    delay: clampedDelay,
    showCloze,
    playCount: clampedCount,
    triggerAutoPlay,
    moveActive,
  });

  const onExtract = () => {
    const count = extractWords();
    if (!count) {
      message.warning('未找到可挖空的法语候选词，请检查文本');
      return;
    }
    message.success(`已提取 ${count} 个候选词并完成挖空`);
  };

  const onReset = () => {
    resetCloze();
    const first = blanks[0];
    if (first) {
      setActiveWordId(first.id);
      if (!autoPlayEnabled) {
        triggerAutoPlay(first.value);
      }
    }
    message.info('已恢复为原文');
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
    if (showCloze) return;
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
      const current = blanks.find((b) => b.id === activeWordId) || blanks[0];
      if (current) {
        setActiveWordId(current.id);
        if (!autoPlayEnabled) {
          triggerAutoPlay(current.value);
        }
      }
    }
  };

  const prefetchAudio = async () => {
    const blankWords = segments.filter((seg) => seg.type === 'blank');
    const uniqueWords = Array.from(new Set(blankWords.map((b) => b.value)));
    if (!uniqueWords.length) {
      message.info('暂无可缓存的挖空词');
      return;
    }
    setPrefetching(true);
    setPrefetchProgress({ done: 0, total: uniqueWords.length });
    try {
      for (let i = 0; i < uniqueWords.length; i += 1) {
        const word = uniqueWords[i];
        // eslint-disable-next-line no-await-in-loop
        await ensureAudio(word);
        setPrefetchProgress({ done: i + 1, total: uniqueWords.length });
      }
      message.success('音频已缓存完成');
    } catch (error) {
      const detail = error.response?.data?.message || error.message;
      message.error(`缓存失败：${detail}`);
    } finally {
      setPrefetching(false);
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

  const onWordActivate = (item) => {
    setActiveWordId(item.id);
    if (!autoPlayEnabled) {
      triggerAutoPlay(item.value);
    }
    openImagesForWord(item.value, item.id);
    if (blurWords) {
      setRevealedIds((prev) => {
        const next = new Set(prev);
        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }
        return next;
      });
    }
  };

  return (
    <>
      <ImageCarousel
        visible={autoCarousel && carouselState.visible}
        state={carouselState}
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
      />

      <div className="chat-layout">
        <div className="workspace-side sidebar-shell">
          <ArticleList
            items={articles}
            loading={articlesLoading}
            saving={articlesSaving}
            onCreate={createArticle}
            onUpdate={updateArticle}
            onDelete={deleteArticle}
            onSelect={(item) => setActiveArticle(item)}
            activeId={activeArticle?.id}
          />
        </div>
        <div className="workspace-main chat-main">
          <Card className="op-panel" bordered>
            <HeroSection
              onExtract={onExtract}
              onReset={onReset}
              onOpenConfig={() => {
                setConfigOpen(true);
                loadConfig();
              }}
              autoPlayCount={autoPlayCount}
              setAutoPlayCount={setAutoPlayCount}
              prefetchAudio={prefetchAudio}
              prefetching={prefetching}
              prefetchProgress={prefetchProgress}
              prefetchImages={prefetchImages}
              imagePrefetching={imagePrefetching}
              imagePrefetchProgress={imagePrefetchProgress}
              autoCarousel={autoCarousel}
              blurWords={blurWords}
              accentCheck={accentCheck}
              autoPlayEnabled={autoPlayEnabled}
              autoPlayDelay={autoPlayDelay}
              setAutoCarousel={setAutoCarousel}
              setBlurWords={setBlurWords}
              setAccentCheck={setAccentCheck}
              setAutoPlayEnabled={setAutoPlayEnabled}
              setAutoPlayDelay={setAutoPlayDelay}
            />
          </Card>
          <Card
            title={activeArticle ? `挖空听写稿 · ${activeArticle.title}` : '挖空听写稿'}
            extra={<Text type="secondary">{showCloze ? '挖空模式' : '原文模式'}</Text>}
          >
            <ExerciseBoard
              segments={segments}
              statuses={statuses}
              answers={answers}
              showCloze={showCloze}
              wordListOpen={wordListOpen}
              selectedWords={selectedWords}
              blurWords={blurWords}
              revealedIds={revealedIds}
              activeWordId={activeWordId}
              onToggleWordList={toggleWordList}
              onInputChange={handleChange}
              onInputKeyDown={handleKeyDown}
              onInputFocus={(item) => {
                if (!autoPlayEnabled) {
                  triggerAutoPlay(item.value);
                }
              }}
              onWordActivate={onWordActivate}
              onKeyNavigate={onKeyNavigate}
              imageMap={imageMap}
              fetchImages={fetchImages}
              onPlay={onPlay}
              loadingWord={loadingWord}
              renderMarkdown={renderMarkdown}
              registerInputRef={(id, el) => {
                if (el) inputRefs.current[id] = el;
              }}
              registerWordRef={(id, el) => {
                if (el) {
                  wordRefs.current[id] = el;
                } else {
                  delete wordRefs.current[id];
                }
              }}
              onPreview={(urls, idx) => {
                setPreviewList(urls);
                setPreviewIndex(idx);
                setPreviewSrc(urls[idx]);
              }}
            />
          </Card>
        </div>
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
