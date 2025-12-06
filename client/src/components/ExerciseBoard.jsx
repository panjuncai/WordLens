import { Button, Divider, Input, Popover, Space, Tag, Typography } from 'antd';
import { PictureOutlined, ReloadOutlined, SoundOutlined, CopyOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function ExerciseBoard({
  segments,
  statuses,
  answers,
  showCloze,
  wordListOpen,
  selectedWords,
  blurWords,
  revealedIds,
  activeWordId,
  onToggleWordList,
  onCopyArticle,
  onInputChange,
  onInputKeyDown,
  onInputFocus,
  onWordActivate,
  onKeyNavigate,
  imageMap,
  fetchImages,
  onPlay,
  loadingWord,
  renderMarkdown,
  registerInputRef,
  registerWordRef,
  onPreview,
}) {
  return (
    <>
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
                  onChange={(e) => onInputChange(item.id, e.target.value)}
                  onKeyDown={(e) => onInputKeyDown(e, item)}
                  onFocus={() => onInputFocus(item)}
                  ref={(el) => {
                    if (el) registerInputRef(item.id, el);
                  }}
                />
              ) : (
                <span
                  className={`word-audio ${activeWordId === item.id ? 'active' : ''} ${
                    blurWords && !revealedIds.has(item.id) ? 'blurred' : ''
                  }`}
                  onClick={() => onWordActivate(item)}
                  role="button"
                  tabIndex={0}
                  ref={(el) => {
                    if (el) {
                      registerWordRef(item.id, el);
                    } else {
                      registerWordRef(item.id, null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onWordActivate(item);
                    }
                  }}
                >
                  {item.value}
                </span>
              )}
              {showCloze && (
                <Popover trigger="hover" content={imageContent} onOpenChange={(open) => open && fetchImages(item.value)}>
                  <Button size="small" type="text" icon={<PictureOutlined />} />
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
        <Button size="small" type="text" icon={<CopyOutlined />} onClick={onCopyArticle} />
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
    </>
  );
}
