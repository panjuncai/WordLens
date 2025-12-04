import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Divider,
  Input,
  InputNumber,
  Popover,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  Modal,
  message,
} from 'antd';
import { PictureOutlined, ReloadOutlined, SoundOutlined, UndoOutlined } from '@ant-design/icons';
import axios from 'axios';
import './App.css';

const { Paragraph, Text } = Typography;
const { TextArea } = Input;

const SAMPLE_SCENE = `## 我的法语微电影：职场、生活与旅行

第一幕：繁忙的都市节奏
你是一名 informaticien。很 tôt，闹钟响了。你翻开 agenda，感叹 “c'est la vie”。新的一 semaine commencer，你去 société travailler。大家在 cabinet 开 réunion，一直很 tard，你只想 rentrer 回家。

第二幕：意外的转折与计划
周五 soir 终于回到家，你拿起 journal voir 广告。mais 去哪里？Londres、Vendôme tous 想去。donc，vacances 是 possible！你抱起 guitare，兴奋起来。

第三幕：旅途中的惊喜邂逅
假期开始，你做了新 coiffure，来到海边 juste là，朝 vers 沙滩 passer 一天。surprise！遇到 docteur 和 célèbre actrice，你们决定今晚 ensemble，把 reste 的故事留给明天。`;

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const wordPattern = /[A-Za-zÀ-ÖØ-öø-ÿ'’\-]+/g;
const articleSet = new Set([
  'un',
  'une',
  'des',
  'du',
  'de',
  'le',
  'la',
  'les',
  "l'",
  'l’',
  "d'",
  'd’',
  'au',
  'aux',
  "qu'",
  'qu’',
  "c'",
  'c’',
  "s'",
  's’',
]);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function extractCandidates(text) {
  const matches = [...(text.matchAll(wordPattern) || [])];
  const tokens = matches.map((m) => m[0]);
  const seen = new Set();
  const combos = [];

  for (let i = 0; i < tokens.length - 1; i += 1) {
    const cur = tokens[i];
    const next = tokens[i + 1];
    if (!cur || !next) continue;
    const lowerCur = cur.toLowerCase();
    if (articleSet.has(lowerCur)) {
      const combo = `${cur} ${next}`;
      const key = combo.toLowerCase();
      if (!seen.has(key)) {
        combos.push(combo);
        seen.add(key);
      }
    }
  }

  const singles = [];
  tokens.forEach((word) => {
    const cleaned = word.replace(/^[^A-Za-zÀ-ÖØ-öø-ÿ]+|[^A-Za-zÀ-ÖØ-öø-ÿ]+$/g, '');
    if (!cleaned || cleaned.length < 2) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    singles.push(cleaned);
  });

  return [...combos, ...singles];
}

function buildSegments(text, targets) {
  if (!targets.length) return [{ type: 'text', value: text }];
  const escaped = targets.map((w) => escapeRegex(w)).join('|');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  let counter = 0;
  return parts.map((part) => {
    const match = targets.find((w) => w.localeCompare(part, undefined, { sensitivity: 'accent', usage: 'search' }) === 0);
    if (match) {
      counter += 1;
      return { type: 'blank', value: match, id: counter };
    }
    return { type: 'text', value: part };
  });
}

function App() {
  const [sceneText, setSceneText] = useState(SAMPLE_SCENE);
  const [candidates, setCandidates] = useState(() => extractCandidates(SAMPLE_SCENE));
  const [selectedWords, setSelectedWords] = useState(() => extractCandidates(SAMPLE_SCENE));
  const [showCloze, setShowCloze] = useState(false);
  const [loadingWord, setLoadingWord] = useState('');
  const [inputCollapsed, setInputCollapsed] = useState(false);
  const [answers, setAnswers] = useState({});
  const [statuses, setStatuses] = useState({});
  const [autoPlayCount, setAutoPlayCount] = useState(1);
  const [prefetching, setPrefetching] = useState(false);
  const [prefetchProgress, setPrefetchProgress] = useState({ done: 0, total: 0 });
  const [activeWordId, setActiveWordId] = useState(null);
  const [wordListOpen, setWordListOpen] = useState(false);
  const inputRefs = useRef({});
  const audioCache = useRef({});
  const [imageMap, setImageMap] = useState({});
  const [previewSrc, setPreviewSrc] = useState('');
  const [previewList, setPreviewList] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  const segments = useMemo(
    () => buildSegments(sceneText, selectedWords),
    [sceneText, selectedWords],
  );
  const blanks = useMemo(() => segments.filter((seg) => seg.type === 'blank'), [segments]);

  useEffect(() => {
    setCandidates(extractCandidates(sceneText));
  }, [sceneText]);

  useEffect(() => {
    setAnswers({});
    setStatuses({});
    inputRefs.current = {};
    setActiveWordId(null);
    setPreviewList([]);
    setPreviewIndex(0);
  }, [sceneText, selectedWords]);

  const onExtract = () => {
    const words = extractCandidates(sceneText);
    if (!words.length) {
      message.warning('未找到可挖空的法语候选词，请检查文本');
      return;
    }
    setCandidates(words);
    setSelectedWords(words);
    setShowCloze(true);
    message.success(`已提取 ${words.length} 个候选词并完成挖空`);
  };

  const onReset = () => {
    setShowCloze(false);
    const first = blanks[0];
    if (first) {
      setActiveWordId(first.id);
      triggerAutoPlay(first.value);
    }
    message.info('已恢复为原文');
  };

  const ensureAudio = async (word) => {
    const key = word.toLowerCase();
    if (audioCache.current[key]) return audioCache.current[key];
    const { data } = await axios.post(`${API_BASE}/api/tts`, { text: word });
    if (!data?.audioBase64) {
      throw new Error('未收到音频，请检查 Azure 配置');
    }
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

  const onPlay = async (word) => {
    setLoadingWord(word);
    try {
      const url = await ensureAudio(word);
      await playAudioUrl(url);
    } catch (error) {
      const detail = error.response?.data?.message || error.response?.data?.error || error.message;
      const status = error.response?.status;
      console.error(error);
      message.error(`调用 Azure TTS 失败${status ? ` (${status})` : ''}${detail ? `: ${detail}` : ''}`);
    } finally {
      setLoadingWord('');
    }
  };

  const wordOptions = candidates.map((word) => ({ label: word, value: word }));

  const handleChange = (id, val) => {
    setAnswers((prev) => ({ ...prev, [id]: val }));
    setStatuses((prev) => ({ ...prev, [id]: undefined }));
  };

  const handleEnter = (item) => {
    const inputVal = (answers[item.id] || '').trim();
    const correct = inputVal.localeCompare(item.value, undefined, { sensitivity: 'accent', usage: 'search' }) === 0;
    setStatuses((prev) => ({ ...prev, [item.id]: correct ? 'correct' : 'wrong' }));
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

  const clampedCount = Math.min(20, Math.max(0, autoPlayCount || 0));

  const triggerAutoPlay = async (word) => {
    if (!clampedCount) return;
    try {
      const url = await ensureAudio(word);
      for (let i = 0; i < clampedCount; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await playAudioUrl(url);
      }
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
      triggerAutoPlay(target.value);
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
        triggerAutoPlay(current.value);
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

  const fetchImages = async (word, refresh = false) => {
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
      const { data } = await axios.get(`${API_BASE}/api/images`, { params: { word, offset: nextPage * 5 } });
      setImageMap((prev) => ({
        ...prev,
        [key]: { urls: data?.urls || [], loading: false, error: null, page: nextPage },
      }));
    } catch (error) {
      setImageMap((prev) => ({ ...prev, [key]: { urls: [], loading: false, error: '获取图片失败', page: nextPage } }));
    }
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

  const infoContent = (
    <div className="info-tip">
      <Text strong>使用步骤</Text>
      <ol>
        <li>粘贴场景文本（可含中文提示和法语词）。</li>
        <li>点“智能提取 + 挖空”生成听写版。</li>
        <li>右侧下拉可增删挖空词，挖空区即时更新。</li>
        <li>点击挖空处问号，Azure TTS 朗读该词；想看原文点“恢复原文”。</li>
      </ol>
      <Text strong>本地存储</Text>
      <Paragraph>数据仅在本机内存，刷新清空；Azure TTS 需在 server/.env 配置 key 与 region 后再启动。</Paragraph>
      <Text strong>技巧</Text>
      <Paragraph>关键法语词多出现几次，优先提取含法语字符的词。</Paragraph>
    </div>
  );

  return (
    <div className="page">
      <Card className="hero">
        <div className="hero-header">
          <Space size="middle" wrap className="hero-actions">
            <Button type="primary" onClick={onExtract}>
              智能提取 + 挖空
            </Button>
            <Button icon={<UndoOutlined />} onClick={onReset}>
              恢复原文
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
            </div>
            <Tooltip title="选择要挖空的单词，可以自行增删">
              <Select
                mode="multiple"
                allowClear
                placeholder="自定义挖空单词"
                value={selectedWords}
                onChange={setSelectedWords}
                options={wordOptions}
                style={{ minWidth: 260 }}
                maxTagCount="responsive"
              />
            </Tooltip>
          </Space>
          <Tooltip title={infoContent} overlayClassName="info-overlay">
            <Button shape="circle" type="text" icon={<SoundOutlined />} />
          </Tooltip>
        </div>
      </Card>

      <div className="stack">
        <Card
          title="输入 / 编辑场景文本"
          className="input-card"
          extra={(
            <Button
              type="link"
              size="small"
              onClick={() => setInputCollapsed((prev) => !prev)}
            >
              {inputCollapsed ? '展开' : '收起'}
            </Button>
          )}
        >
          {!inputCollapsed && (
            <TextArea
              value={sceneText}
              onChange={(e) => setSceneText(e.target.value)}
              autoSize={{ minRows: 6, maxRows: 10 }}
              placeholder="在此粘贴你的法语或双语场景脚本"
            />
          )}
        </Card>

        <Card
          title="挖空听写稿"
          extra={<Text type="secondary">{showCloze ? '挖空模式' : '原文模式'}</Text>}
        >
          <div className="cloze" tabIndex={0} onKeyDown={onKeyNavigate}>
            {segments.map((item, idx) => {
              if (item.type === 'text') {
                return (
                  <Text key={`t-${idx}`} className="cloze-text">
                    {item.value}
                  </Text>
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
                      onFocus={() => triggerAutoPlay(item.value)}
                      ref={(el) => {
                        if (el) inputRefs.current[item.id] = el;
                      }}
                    />
                  ) : (
                    <span
                      className={`word-audio ${activeWordId === item.id ? 'active' : ''}`}
                      onClick={() => {
                        setActiveWordId(item.id);
                        triggerAutoPlay(item.value);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setActiveWordId(item.id);
                          triggerAutoPlay(item.value);
                        }
                      }}
                    >
                      {item.value}
                    </span>
                  )}
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
            <Button type="link" size="small" onClick={() => setWordListOpen((p) => !p)}>
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
