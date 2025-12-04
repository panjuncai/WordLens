import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Divider,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { QuestionCircleOutlined, UndoOutlined } from '@ant-design/icons';
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

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function extractCandidates(text) {
  const matches = text.match(wordPattern) || [];
  const seen = new Set();
  const candidates = [];
  matches.forEach((raw) => {
    const cleaned = raw.replace(/^[^A-Za-zÀ-ÖØ-öø-ÿ]+|[^A-Za-zÀ-ÖØ-öø-ÿ]+$/g, '');
    if (!cleaned || cleaned.length < 2) return;
    const lower = cleaned.toLowerCase();
    if (seen.has(lower)) return;
    seen.add(lower);
    candidates.push(cleaned);
  });
  return candidates;
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
  const inputRefs = useRef({});
  const audioCache = useRef({});

  const segments = useMemo(
    () => buildSegments(sceneText, selectedWords),
    [sceneText, selectedWords],
  );

  useEffect(() => {
    setCandidates(extractCandidates(sceneText));
  }, [sceneText]);

  useEffect(() => {
    setAnswers({});
    setStatuses({});
    inputRefs.current = {};
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

  const handleEnter = (e, item) => {
    if (e.key !== 'Enter') return;
    const inputVal = (answers[item.id] || '').trim();
    const correct = inputVal.localeCompare(item.value, undefined, { sensitivity: 'accent', usage: 'search' }) === 0;
    setStatuses((prev) => ({ ...prev, [item.id]: correct ? 'correct' : 'wrong' }));
    if (correct) {
      const blanks = segments.filter((seg) => seg.type === 'blank');
      const idx = blanks.findIndex((seg) => seg.id === item.id);
      const next = blanks[idx + 1];
      if (next) {
        setTimeout(() => inputRefs.current[next.id]?.focus(), 10);
      }
    } else {
      setTimeout(() => inputRefs.current[item.id]?.focus(), 10);
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
            <Button shape="circle" type="text" icon={<QuestionCircleOutlined />} />
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
          <div className="cloze">
            {segments.map((item, idx) => {
              if (item.type === 'text') {
                return (
                  <Text key={`t-${idx}`} className="cloze-text">
                    {item.value}
                  </Text>
                );
              }
              const status = statuses[item.id];
              return (
                <span key={`b-${idx}`} className="blank">
                  {showCloze ? (
                    <Input
                      size="small"
                      className={`blank-input ${status || ''}`}
                      placeholder="____"
                      value={answers[item.id] || ''}
                      onChange={(e) => handleChange(item.id, e.target.value)}
                      onKeyDown={(e) => handleEnter(e, item)}
                      onFocus={() => triggerAutoPlay(item.value)}
                      ref={(el) => {
                        if (el) inputRefs.current[item.id] = el;
                      }}
                    />
                  ) : (
                    item.value
                  )}
                  <Button
                    size="small"
                    type="text"
                    icon={<QuestionCircleOutlined />}
                    loading={loadingWord === item.value}
                    onClick={() => onPlay(item.value)}
                  />
                </span>
              );
            })}
          </div>
          <Divider />
          <Space size="small" wrap align="center">
            <Text strong>当前挖空词：</Text>
            {selectedWords.length ? (
              selectedWords.map((w) => <Tag key={w}>{w}</Tag>)
            ) : (
              <Text type="secondary">暂无，点击上方“智能提取”</Text>
            )}
          </Space>
        </Card>
      </div>

    </div>
  );
}

export default App;
