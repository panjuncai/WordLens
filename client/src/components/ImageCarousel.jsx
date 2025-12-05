import { Button, Typography } from 'antd';
import { CloseOutlined, ReloadOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function ImageCarousel({
  visible,
  state,
  onClose,
  onNext,
  onPrev,
  onRefresh,
  onWheel,
  onPreview,
  innerRef,
}) {
  if (!visible) return null;
  const { urls = [], index = 0, loading, word } = state || {};
  return (
    <div className="carousel-overlay" onWheel={onWheel} ref={innerRef}>
      <Button size="small" type="text" icon={<CloseOutlined />} className="carousel-close" onClick={onClose} />
      <div className="carousel-slide">
        {loading && <Text type="secondary">图片加载中...</Text>}
        {!loading && urls.length === 0 && <Text type="secondary">暂无图片</Text>}
        {!loading && urls.length > 0 && (
          <>
            <Button className="carousel-arrow left" shape="circle" size="small" type="text" onClick={onPrev}>
              ‹
            </Button>
            <Button className="carousel-arrow right" shape="circle" size="small" type="text" onClick={onNext}>
              ›
            </Button>
            <img
              src={urls[index]}
              alt={word}
              onClick={() => {
                if (onPreview) onPreview(urls, index);
              }}
            />
            <Button
              size="small"
              type="text"
              icon={<ReloadOutlined />}
              className="carousel-refresh"
              onClick={(e) => {
                e.stopPropagation();
                onRefresh(word);
              }}
            >
              换一组
            </Button>
            <div className="carousel-dots">
              {urls.map((_, i) => (
                <span key={`${word}-${i}`} className={`carousel-dot ${i === index ? 'active' : ''}`} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
