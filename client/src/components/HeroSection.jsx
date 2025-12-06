import { Button, Dropdown, InputNumber, Space, Switch, Typography } from 'antd';
import { EllipsisOutlined, ReloadOutlined, SoundOutlined, UndoOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function HeroSection({
  onExtract,
  onReset,
  showCloze,
  onReadAll,
  readingAll,
  autoPlayCount,
  setAutoPlayCount,
  prefetchAudio,
  prefetching,
  prefetchProgress,
  prefetchChinese,
  prefetchingCn,
  prefetchProgressCn,
  prefetchImages,
  imagePrefetching,
  imagePrefetchProgress,
  autoCarousel,
  blurWords,
  accentCheck,
  foreignLineBreak,
  setAutoCarousel,
  setBlurWords,
  setAccentCheck,
  setForeignLineBreak,
}) {
  const menuItems = [
    {
      key: 'count',
      label: (
        <div className="hero-menu-row" onClick={(e) => e.stopPropagation()}>
          <Text>自动发音次数</Text>
          <InputNumber
            size="small"
            min={0}
            max={20}
            value={autoPlayCount}
            onChange={(v) => setAutoPlayCount(v || 0)}
            style={{ width: 80 }}
          />
        </div>
      ),
    },
    {
      key: 'audio',
      label: '拉取外语声音',
      disabled: prefetching,
    },
    {
      key: 'audio-cn',
      label: '拉取中文声音',
      disabled: prefetchingCn,
    },
    {
      key: 'image',
      label: '拉取图片',
      disabled: imagePrefetching,
    },
    {
      key: 'accent',
      label: (
        <div className="hero-menu-row" onClick={(e) => e.stopPropagation()}>
          <Text>重音检查</Text>
          <Switch size="small" checked={accentCheck} onChange={setAccentCheck} />
        </div>
      ),
    },
    {
      key: 'linebreak',
      label: (
        <div className="hero-menu-row" onClick={(e) => e.stopPropagation()}>
          <Text>外语换行</Text>
          <Switch size="small" checked={foreignLineBreak} onChange={setForeignLineBreak} />
        </div>
      ),
    },
  ];

  const handleMenuClick = ({ key }) => {
    if (key === 'audio') prefetchAudio();
    if (key === 'audio-cn') prefetchChinese();
    if (key === 'image') prefetchImages();
  };

  const primaryLabel = showCloze ? '恢复原文' : '填空练习';
  const handlePrimary = showCloze ? onReset : onExtract;

  return (
    <div className="hero-header">
      <div className="hero-toolbar">
        <div className="hero-section hero-section-start" />

        <div className="hero-section hero-section-center">
          <Space size="middle" wrap align="center">
            <Button type="primary" onClick={handlePrimary}>
              {primaryLabel}
            </Button>
            <Space size="small" align="center">
              <Text type="secondary">自动轮播</Text>
              <Switch size="small" checked={autoCarousel} onChange={setAutoCarousel} />
            </Space>
            <Space size="small" align="center">
              <Text type="secondary">高斯模糊</Text>
              <Switch size="small" checked={blurWords} onChange={setBlurWords} />
            </Space>
            <Button icon={<SoundOutlined />} onClick={onReadAll} loading={readingAll}>
              全文朗读
            </Button>
            <div className="hero-progress">
              {prefetching && (
                <Text type="secondary" style={{ marginRight: 12 }}>
                  外语 {prefetchProgress.done}/{prefetchProgress.total}
                </Text>
              )}
              {prefetchingCn && (
                <Text type="secondary" style={{ marginRight: 12 }}>
                  中文 {prefetchProgressCn.done}/{prefetchProgressCn.total}
                </Text>
              )}
              {imagePrefetching && (
                <Text type="secondary">
                  图片 {imagePrefetchProgress.done}/{imagePrefetchProgress.total}
                </Text>
              )}
            </div>
          </Space>
        </div>

        <div className="hero-section hero-section-end">
          <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} trigger={['click']} placement="bottomRight">
            <Button type="text" icon={<EllipsisOutlined />} />
          </Dropdown>
        </div>
      </div>

      
    </div>
  );
}
