import { Button, Divider, Input, Popover, Space, Tag, Typography,Tooltip } from 'antd';
import { PictureOutlined, ReloadOutlined, CopyOutlined,QuestionCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

const splitOuterWhitespace = (value) => {
  const raw = value == null ? '' : String(value);
  const leadingMatch = raw.match(/^[\s\u00a0]+/);
  const trailingMatch = raw.match(/[\s\u00a0]+$/);
  const leading = leadingMatch ? leadingMatch[0] : '';
  const trailing = trailingMatch ? trailingMatch[0] : '';
  const core = raw.replace(/^[\s\u00a0]+|[\s\u00a0]+$/g, '');
  return { leading, core, trailing };
};

const clamp = (min, val, max) => Math.max(min, Math.min(max, val));

const computeBlankWidth = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '80px';
  const normalized = raw.replace(/\s+/g, ' ');
  const len = normalized.length;
  // Use ch units so the box visually matches text length across fonts; keep within reasonable bounds.
  const widthCh = clamp(6, len + 2, 34);
  return `${widthCh}ch`;
};

export default function ExerciseBoard({
  segments,
  statuses,
  answers,
  showCloze,
  wordListOpen,
  selectedWords,
  blurWords,
  revealedIds,
  activeIndex,
  onToggleWordList,
  onCopyArticle,
  onInputChange,
  onInputKeyDown,
  onInputFocus,
  onChunkActivate,
  onKeyNavigate,
  imageMap,
  fetchImages,
  onPlay,
  loadingWord,
  registerInputRef,
  onPreview,
  registerChunkRef = () => {},
}) {
  const handleChunkKey = (e, segment) => {
    const target = e.target;
    const tag = target?.tagName?.toLowerCase?.();
    if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChunkActivate(segment);
    }
  };

  return (
    <>
      <div className="cloze" tabIndex={0} onKeyDown={onKeyNavigate}>
        {segments.map((segment, idx) => {
          const key = `${segment.id}-${segment.index}-${idx}`;
          const isBlank = segment.role === 'blank';
          const status = isBlank ? statuses[segment.id] : undefined;
          const entry = isBlank ? imageMap[segment.value.toLowerCase()] : null;
          const isActive = segment.index === activeIndex;
          const isPunct = segment.type === 'punct';
          const chunkClass = [
            'chunk-item',
            isBlank ? 'blank chunk-blank' : 'chunk-text',
            `chunk-${segment.type}`,
            isPunct ? 'chunk-punct' : '',
            isActive && !isPunct ? 'chunk-active' : '',
          ].filter(Boolean).join(' ');

          if (!isBlank) {
            const { leading, core, trailing } = splitOuterWhitespace(segment.value);
            if (!core) {
              return (
                <span key={key} className="cloze-text">
                  {segment.value}
                </span>
              );
            }
            const isForeign = segment.type === 'fr' && !isPunct;
            const isBlurred = blurWords && isForeign && !revealedIds.has(segment.id);
            const decoratedChunkClass = `${chunkClass}${isBlurred ? ' chunk-blurred' : ''}`;
            return (
              <span key={key} className="chunk-wrap">
                {leading && <span className="cloze-text">{leading}</span>}
                <span
                  className={decoratedChunkClass}
                  ref={(el) => registerChunkRef(segment.index, el)}
                  onClick={() => {
                    if (!isPunct) onChunkActivate(segment);
                  }}
                  onKeyDown={(e) => {
                    if (!isPunct) handleChunkKey(e, segment);
                  }}
                  role={isPunct ? undefined : 'button'}
                  tabIndex={isPunct ? -1 : 0}
                >
                  <span className="cloze-text">{core}</span>
                </span>
                {trailing && <span className="cloze-text">{trailing}</span>}
              </span>
            );
          }

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
                      alt={segment.value}
                      className="image-thumb"
                      onClick={() => onPreview(entry.urls, i)}
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
                    fetchImages(segment.value, true);
                  }}
                >
                  换一组
                </Button>
              </div>
            </div>
          );
          return (
            <span
              key={key}
              className={chunkClass}
              ref={(el) => registerChunkRef(segment.index, el)}
              onClick={() => onChunkActivate(segment)}
              onKeyDown={(e) => handleChunkKey(e, segment)}
              role="button"
              tabIndex={showCloze ? -1 : 0}
            >
              {showCloze ? (
                <Input
                  size="small"
                  className={`blank-input ${status || ''}`}
                  placeholder=""
                  value={answers[segment.id] || ''}
                  onChange={(e) => onInputChange(segment.id, e.target.value)}
                  onKeyDown={(e) => onInputKeyDown(e, segment)}
                  onPressEnter={(e) => onInputKeyDown(e, segment)}
                  onFocus={() => onInputFocus(segment)}
                  style={{ width: computeBlankWidth(segment.value) }}
                  ref={(el) => {
                    registerInputRef(segment.id, el);
                  }}
                />
              ) : (
                <span
                  className={`word-audio ${blurWords && !revealedIds.has(segment.id) ? 'blurred' : ''}`}
                >
                  {segment.value}
                </span>
              )}
              {showCloze && (
                <Popover trigger="hover" content={imageContent} onOpenChange={(open) => open && fetchImages(segment.value)}>
                  <Button
                    size="small"
                    type="text"
                    icon={<PictureOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popover>
              )}
              {showCloze && (
                <Popover content={segment.value} trigger="click">
                  <Button
                    size="small"
                    type="text"
                    icon={<QuestionCircleOutlined />}
                    loading={loadingWord === segment.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlay(segment.value);
                    }}
                  />
                </Popover>
              )}
            </span>
          );
        })}
      </div>
      <Divider />
      <Space size="small" wrap align="center">
        <Tooltip title="全文复制">
          <Button size="small" type="text" icon={<CopyOutlined />} onClick={onCopyArticle} />
        </Tooltip>
        <Text strong>当前挖空词：</Text>
        <Button type="link" size="small" onClick={onToggleWordList}>
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
      <br/>
      <br/>
      <br/>
      <br/>
      <br/>
      <br/>
    </>
  );
}
