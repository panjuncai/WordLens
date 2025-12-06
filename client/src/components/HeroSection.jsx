import { Button, InputNumber, Space, Switch, Typography } from 'antd';
import { ReloadOutlined, UndoOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function HeroSection({
  onExtract,
  onReset,
  autoPlayCount,
  setAutoPlayCount,
  prefetchAudio,
  prefetching,
  prefetchProgress,
  prefetchImages,
  imagePrefetching,
  imagePrefetchProgress,
  autoCarousel,
  blurWords,
  accentCheck,
  setAutoCarousel,
  setBlurWords,
  setAccentCheck,
}) {
  return (
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
          <Button size="small" onClick={prefetchAudio} loading={prefetching}>
            拉取声音
          </Button>
          {prefetching && (
            <Text type="secondary">
              {prefetchProgress.done}/{prefetchProgress.total}
            </Text>
          )}
          <Button size="small" onClick={prefetchImages} loading={imagePrefetching}>
            拉取图片
          </Button>
          <Space size="small" align="center">
            <Text type="secondary">自动轮播</Text>
            <Switch size="small" checked={autoCarousel} onChange={setAutoCarousel} />
          </Space>
          <Space size="small" align="center">
            <Text type="secondary">高斯模糊</Text>
            <Switch size="small" checked={blurWords} onChange={setBlurWords} />
          </Space>
          <Space size="small" align="center">
            <Text type="secondary">重音检查</Text>
            <Switch size="small" checked={accentCheck} onChange={setAccentCheck} />
          </Space>
          {imagePrefetching && (
            <Text type="secondary">
              {imagePrefetchProgress.done}/{imagePrefetchProgress.total}
            </Text>
          )}
        </div>
      </Space>
    </div>
  );
}
