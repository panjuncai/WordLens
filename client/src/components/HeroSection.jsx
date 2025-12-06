import { Button, Dropdown, InputNumber, Space, Switch, Typography,Tooltip } from 'antd';
import {
  EllipsisOutlined,
  ReloadOutlined,
  PoweroffOutlined,
  SoundOutlined,
  PauseOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  FormOutlined,
  RedoOutlined,
  RetweetOutlined
} from '@ant-design/icons';

const { Text } = Typography;

export default function HeroSection({
  onExtract,
  onReset,
  showCloze,
  onReadAll,
  readingAll,
  onTogglePause,
  isPlaying,
  isPaused,
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
  setAutoCarousel,
  setBlurWords,
  setAccentCheck,
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
      label: '缓存外语音频',
      disabled: prefetching,
    },
    {
      key: 'audio-cn',
      label: '缓存中文音频',
      disabled: prefetchingCn,
    },
    {
      key: 'image',
      label: '缓存图片',
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
  ];

  const handleMenuClick = ({ key }) => {
    if (key === 'audio') prefetchAudio();
    if (key === 'audio-cn') prefetchChinese();
    if (key === 'image') prefetchImages();
  };

  return (
    <div className="hero-header">
      <div className="hero-toolbar">
        <div className="hero-section hero-section-start" />

        <div className="hero-section hero-section-center">
          <Space size="middle" wrap align="center">
            <Space size="small" align="center">
              <Tooltip title="全文朗读">
                <Button type="text" icon={<SoundOutlined />} onClick={onReadAll} loading={readingAll}>
                </Button>
              </Tooltip>
              <Tooltip title={isPaused ? '继续' : '暂停'}>
                <Button type="text" icon={<PauseOutlined />} onClick={onTogglePause} disabled={!isPlaying} />
              </Tooltip>
            </Space>
            <Space size="small" align="center">
              <Tooltip title="练习模式(听写/原文)">
                <Switch
                  size="large"
                  checked={showCloze}
                  onChange={(checked) => {
                    if (checked) onExtract();
                    else onReset();
                  }}
                  checkedChildren={<FormOutlined />}
                  unCheckedChildren={<RedoOutlined />}
                />
              </Tooltip>
            </Space>
            <Space size="small" align="center">
              <Tooltip title="图片轮播">
                <Switch
                  size="large"
                  checked={autoCarousel}
                  onChange={setAutoCarousel}
                  checkedChildren={<RetweetOutlined />}
                  unCheckedChildren={<PoweroffOutlined  />}
                />
              </Tooltip>
            </Space>
            <Space size="small" align="center">
              <Tooltip title="单词遮挡">
                <Switch
                  size="large"
                  checked={blurWords}
                  onChange={setBlurWords}
                  checkedChildren={<EyeInvisibleOutlined />}
                  unCheckedChildren={<EyeOutlined />}
                />
              </Tooltip>
            </Space>
            
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
