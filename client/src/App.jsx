import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Divider,
  Input,
  InputNumber,
  Popover,
  Space,
  Tag,
  Switch,
  Typography,
  Modal,
  message,
} from 'antd';
import { PictureOutlined, ReloadOutlined, SoundOutlined, UndoOutlined, CloseOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import api from './api';
import LoginScreen from './components/LoginScreen';
import ConfigModal from './components/ConfigModal';
import ArticleList from './components/ArticleList';
import useTtsAudio from './hooks/useTtsAudio';
import useImageSearch from './hooks/useImageSearch';
import useArticles from './hooks/useArticles';
import useAuthStore from './stores/useAuthStore';
import useExerciseStore from './stores/useExerciseStore';
import useConfigStore from './stores/useConfigStore';
import './App.css';

const { Text } = Typography;
const { TextArea } = Input;

function App() {
  const {
    user,
    mode: authMode,
    setMode: setAuthMode,
    loading: authLoading,
    login: loginUser,
    register: registerUser,
    logout,
    checkAuth,
  } = useAuthStore();
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [loadingWord, setLoadingWord] = useState('');
  const [prefetching, setPrefetching] = useState(false);
  const [prefetchProgress, setPrefetchProgress] = useState({ done: 0, total: 0 });
  const [activeWordId, setActiveWordId] = useState(null);
  const inputRefs = useRef({});
  const [previewSrc, setPreviewSrc] = useState('');
  const [previewList, setPreviewList] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [openImageWordId, setOpenImageWordId] = useState(null);
  const [carouselState, setCarouselState] = useState({
    word: '',
    urls: [],
    index: 0,
    visible: false,
    loading: false,
  });
  const carouselRef = useRef(null);
  const wordRefs = useRef({});
  const autoPlayTimer = useRef(null);
  const {
    sceneText,
    selectedWords,
    segments,
    showCloze,
    answers,
    statuses,
    wordListOpen,
    revealedIds,
    loadArticle,
    extractWords,
    resetCloze,
    setAnswer,
    setStatus,
    toggleWordList,
    setRevealedIds,
  } = useExerciseStore();
  const {
    autoCarousel,
    blurWords,
    accentCheck,
    autoPlayEnabled,
    autoPlayDelay,
    autoPlayCount,
    setAutoCarousel,
    setBlurWords,
    setAccentCheck,
    setAutoPlayEnabled,
    setAutoPlayDelay,
    setAutoPlayCount,
    azureKey,
    azureRegion,
    azureVoice,
    setAzureKey,
    setAzureRegion,
    setAzureVoice,
  } = useConfigStore();
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
  const [activeArticle, setActiveArticle] = useState(null);

  const blanks = useMemo(() => segments.filter((seg) => seg.type === 'blank'), [segments]);
  const clampedCount = Math.min(20, Math.max(0, autoPlayCount || 0));

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
    checkAuth();
  }, []);

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
    setOpenImageWordId(null);
    setCarouselState((prev) => ({ ...prev, visible: false, word: '', urls: [], loading: false }));
  }, [sceneText, selectedWords]);

  useEffect(() => {
    if (showCloze) {
      setOpenImageWordId(null);
      setCarouselState((prev) => ({ ...prev, visible: false }));
    }
  }, [showCloze]);

  useEffect(() => {
    if (!autoCarousel) {
      setCarouselState((prev) => ({ ...prev, visible: false }));
    }
  }, [autoCarousel]);

  useEffect(() => {
    return () => {
      if (autoPlayTimer.current) {
        clearTimeout(autoPlayTimer.current);
        autoPlayTimer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (autoPlayTimer.current) {
      clearTimeout(autoPlayTimer.current);
      autoPlayTimer.current = null;
    }
    if (!autoPlayEnabled || showCloze || !blanks.length || !clampedCount) return;
    const current = blanks.find((b) => b.id === activeWordId) || blanks[0];
    if (!current) return;
    let cancelled = false;
    const run = async () => {
      try {
        await triggerAutoPlay(current.value);
      } catch {
        // ignore
      }
      if (cancelled) return;
      autoPlayTimer.current = setTimeout(() => {
        moveActive(1);
      }, Math.min(60, Math.max(1, autoPlayDelay)) * 1000);
    };
    run();
    return () => {
      cancelled = true;
      if (autoPlayTimer.current) {
        clearTimeout(autoPlayTimer.current);
        autoPlayTimer.current = null;
      }
    };
  }, [activeWordId, autoPlayEnabled, autoPlayDelay, showCloze, blanks, clampedCount]);

  useEffect(() => {
    if (!blurWords) {
      setRevealedIds(new Set());
    }
  }, [blurWords]);

  useEffect(() => {
    if (!carouselState.visible || carouselState.urls.length <= 1) return undefined;
    const timer = setInterval(() => {
      setCarouselState((prev) => ({
        ...prev,
        index: prev.urls.length ? (prev.index + 1) % prev.urls.length : 0,
      }));
    }, 2500);
    return () => clearInterval(timer);
  }, [carouselState.visible, carouselState.urls]);

  const markdownComponents = {
    p: ({ children, ...props }) => <span {...props}>{children}</span>,
    strong: ({ children, ...props }) => <strong {...props}>{children}</strong>,
    em: ({ children, ...props }) => <em {...props}>{children}</em>,
    code: ({ children, ...props }) => <code className="md-inline-code" {...props}>{children}</code>,
    a: ({ children, href, ...props }) => (
      <a href={href} target="_blank" rel="noreferrer" {...props}>
        {children}
      </a>
    ),
    ul: ({ children, ...props }) => <ul className="md-list" {...props}>{children}</ul>,
    ol: ({ children, ...props }) => <ol className="md-list" {...props}>{children}</ol>,
    li: ({ children, ...props }) => <li {...props}>{children}</li>,
    br: () => <br />,
  };

  const renderMarkdown = (value) => (
    <span className="markdown-text">
      <ReactMarkdown
        components={markdownComponents}
      >
        {value || ''}
      </ReactMarkdown>
    </span>
  );

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
      // 错误已在 hook 中处理
    } finally {
      setLoadingWord('');
    }
  };

  //const wordOptions = selectedWords.map((word) => ({ label: word, value: word }));

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

  const triggerAutoPlay = async (word) => {
    if (!clampedCount) return;
    try {
      await playWord(word, clampedCount);
    } catch (error) {
      console.error('Auto play failed', error);
    }
  };

  const moveActive = (delta) => {
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
    const blanks = segments.filter((seg) => seg.type === 'blank');
    const uniqueWords = Array.from(new Set(blanks.map((b) => b.value)));
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

  const openImagesForWord = (word, id = null) => {
    if (showCloze) return;
    const key = word.toLowerCase();
    const entry = imageMap[key];
    setOpenImageWordId(id);
    setCarouselState({
      word,
      urls: entry?.urls || [],
      index: 0,
      visible: autoCarousel,
      loading: !entry?.urls?.length,
    });
    fetchImages(word);
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

  const fetchImages = async (word, refresh = false) => {
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

  const handleAuthSubmit = async () => {
    if (authMode === 'login') await loginUser(authEmail, authPassword);
    else await registerUser(authEmail, authPassword);
  };

  const handleLogout = () => {
    logout();
  };

  useEffect(() => {
    if (!previewSrc) return undefined;
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
    return () => window.removeEventListener('keydown', handleKey);
  }, [previewSrc, previewList]);

  if (!user) {
    return (
      <LoginScreen
        mode={authMode}
        setMode={setAuthMode}
        email={authEmail}
        password={authPassword}
        onChangeEmail={setAuthEmail}
        onChangePassword={setAuthPassword}
        onSubmit={handleAuthSubmit}
        loading={authLoading}
      />
    );
  }

  return (
    <div className="page">
      {autoCarousel && carouselState.visible && (
        <div
          className="carousel-overlay"
          onWheel={handleCarouselWheel}
          ref={carouselRef}
        >
          <Button
            size="small"
            type="text"
            icon={<CloseOutlined />}
            className="carousel-close"
            onClick={() => setCarouselState((prev) => ({ ...prev, visible: false }))}
          />
          <div className="carousel-slide">
            {carouselState.loading && <Text type="secondary">图片加载中...</Text>}
            {!carouselState.loading && carouselState.urls.length === 0 && (
              <Text type="secondary">暂无图片</Text>
            )}
            {!carouselState.loading && carouselState.urls.length > 0 && (
              <>
                <Button
                  className="carousel-arrow left"
                  shape="circle"
                  size="small"
                  type="text"
                  onClick={prevSlide}
                >
                  ‹
                </Button>
                <Button
                  className="carousel-arrow right"
                  shape="circle"
                  size="small"
                  type="text"
                  onClick={nextSlide}
                >
                  ›
                </Button>
                <img
                  src={carouselState.urls[carouselState.index]}
                  alt={carouselState.word}
                  onClick={() => {
                    setPreviewList(carouselState.urls);
                    setPreviewIndex(carouselState.index);
                    setPreviewSrc(carouselState.urls[carouselState.index]);
                  }}
                />
                <Button
                  size="small"
                  type="text"
                  icon={<ReloadOutlined />}
                  className="carousel-refresh"
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchImages(carouselState.word, true);
                  }}
                >
                  换一组
                </Button>
                <div className="carousel-dots">
                  {carouselState.urls.map((_, i) => (
                    <span
                      key={`${carouselState.word}-${i}`}
                      className={`carousel-dot ${i === carouselState.index ? 'active' : ''}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <Card className="hero">
        <div className="hero-header">
          <Space size="middle" wrap className="hero-actions">
            <Button type="primary" onClick={onExtract}>
              智能提取 + 挖空
            </Button>
            <Button icon={<UndoOutlined />} onClick={onReset}>
              恢复原文
            </Button>
            <Button onClick={() => { setConfigOpen(true); loadConfig(); }}>
              TTS配置
            </Button>
            <div className="audio-config">
              <Text type="secondary">自动发音次数</Text>
              <InputNumber
                size="small"
                min={0}
                max={20}
                value={autoPlayCount}
                onChange={(v) => setAutoPlayCount(v || 0)}
              />
              <Button
                size="small"
                onClick={prefetchAudio}
                loading={prefetching}
              >
                拉取声音
              </Button>
              {prefetching && (
                <Text type="secondary">
                  {prefetchProgress.done}/{prefetchProgress.total}
                </Text>
              )}
              <Button
                size="small"
                onClick={prefetchImages}
                loading={imagePrefetching}
              >
                拉取图片
              </Button>
              <Space size="small" align="center">
                <Text type="secondary">自动轮播</Text>
                <Switch
                  size="small"
                  checked={autoCarousel}
                  onChange={(v) => setAutoCarousel(v)}
                />
              </Space>
              <Space size="small" align="center">
                <Text type="secondary">高斯模糊</Text>
                <Switch
                  size="small"
                  checked={blurWords}
                  onChange={(v) => setBlurWords(v)}
                />
              </Space>
              <Space size="small" align="center">
                <Text type="secondary">重音检查</Text>
                <Switch
                  size="small"
                  checked={accentCheck}
                  onChange={(v) => setAccentCheck(v)}
                />
              </Space>
              <Space size="small" align="center">
                <Text type="secondary">自动播放</Text>
                <Switch
                  size="small"
                  checked={autoPlayEnabled}
                  onChange={(v) => setAutoPlayEnabled(v)}
                />
                <InputNumber
                  size="small"
                  min={1}
                  max={60}
                  value={autoPlayDelay}
                  onChange={(v) => setAutoPlayDelay(Math.min(60, Math.max(1, v || 1)))}
                  disabled={!autoPlayEnabled}
                  style={{ width: 80 }}
                />
                <Text type="secondary">秒</Text>
              </Space>
              {imagePrefetching && (
                <Text type="secondary">
                  {imagePrefetchProgress.done}/{imagePrefetchProgress.total}
                </Text>
              )}
              <Space size="small" align="center">
                <Text type="secondary">{user?.email}</Text>
                <Button type="link" onClick={handleLogout}>退出</Button>
              </Space>
            </div>
          </Space>
        </div>
      </Card>

      <div className="workspace">
        <div className="workspace-side">
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
        <div className="workspace-main">
          <Card
            title={activeArticle ? `挖空听写稿 · ${activeArticle.title}` : '挖空听写稿'}
            extra={<Text type="secondary">{showCloze ? '挖空模式' : '原文模式'}</Text>}
          >
            <div className="cloze" tabIndex={0} onKeyDown={onKeyNavigate}>
            {segments.map((item, idx) => {
              if (item.type === 'text') {
                return (
                  <span key={`t-${idx}`} className="cloze-text">
                    {renderMarkdown(item.value)}
                  </span>
                );
              }
              const status = statuses[item.id];
              const entry = imageMap[item.value.toLowerCase()];
              const imageContent = (
                <div className="image-grid">
                      {entry?.loading && <Text type="secondary">加载中...</Text>}
                      {!entry?.loading && entry?.error && <Text type="danger">{entry.error}</Text>}
                      {!entry?.loading && !entry?.error && !entry?.urls?.length && <Text type="secondary">暂无图片</Text>}
                      {!entry?.loading && entry?.urls?.length > 0 && (
                        <>
                          {entry.urls.map((src, i) => (
                            <img
                              key={src || i}
                              src={src}
                              alt={item.value}
                              className="image-thumb"
                              onClick={() => {
                                setPreviewList(entry.urls);
                                setPreviewIndex(i);
                                setPreviewSrc(src);
                              }}
                            />
                          ))}
                        </>
                      )}
                  <div className="image-actions">
                    <Button
                      size="small"
                      type="link"
                      icon={<ReloadOutlined />}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        fetchImages(item.value, true);
                      }}
                    >
                      换一组
                    </Button>
                  </div>
                </div>
              );
              return (
                <span key={`b-${idx}`} className="blank">
                  {showCloze ? (
                    <Input
                      size="small"
                      className={`blank-input ${status || ''}`}
                      placeholder="____"
                      value={answers[item.id] || ''}
                      onChange={(e) => handleChange(item.id, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, item)}
                      onFocus={() => {
                        if (!autoPlayEnabled) {
                          triggerAutoPlay(item.value);
                        }
                      }}
                      ref={(el) => {
                        if (el) inputRefs.current[item.id] = el;
                      }}
                    />
                  ) : (
                    <span
                      className={`word-audio ${activeWordId === item.id ? 'active' : ''} ${blurWords && !revealedIds.has(item.id) ? 'blurred' : ''}`}
                      onClick={() => {
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
                      }}
                      role="button"
                      tabIndex={0}
                      ref={(el) => {
                        if (el) {
                          wordRefs.current[item.id] = el;
                        } else {
                          delete wordRefs.current[item.id];
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
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
                        }
                      }}
                    >
                      {item.value}
                    </span>
                  )}
                  {showCloze && (
                    <Popover
                      trigger="hover"
                      content={imageContent}
                      onOpenChange={(open) => open && fetchImages(item.value)}
                    >
                      <Button
                        size="small"
                        type="text"
                        icon={<PictureOutlined />}
                      />
                    </Popover>
                  )}
                  {showCloze && (
                    <Popover content={item.value} trigger="click">
                      <Button
                        size="small"
                        type="text"
                        icon={<SoundOutlined />}
                        loading={loadingWord === item.value}
                        onClick={() => onPlay(item.value)}
                      />
                    </Popover>
                  )}
                </span>
              );
            })}
          </div>
          <Divider />
            <Space size="small" wrap align="center">
              <Text strong>当前挖空词：</Text>
              <Button type="link" size="small" onClick={toggleWordList}>
                {wordListOpen ? '折叠' : '展开'}
              </Button>
            {wordListOpen && (
              <>
                {selectedWords.length ? (
                  selectedWords.map((w) => <Tag key={w}>{w}</Tag>)
                ) : (
                  <Text type="secondary">暂无，点击上方“智能提取”</Text>
                )}
              </>
            )}
          </Space>
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
        destroyOnClose
      >
        <img
          src={previewList[previewIndex] || previewSrc}
          alt="预览"
          style={{ display: 'block', maxWidth: '80vw', maxHeight: '80vh', objectFit: 'contain' }}
        />
      </Modal>

    </div>
  );
}

export default App;
