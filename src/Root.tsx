import React from 'react';
import { Composition } from 'remotion';
import { VideoComponent, VideoProps } from './VideoComponent';

// Fallback / default metadata
const defaultProps: VideoProps = {
  title: 'AI 自动化云端视频工作台',
  subtitle: 'GitHub Actions 自动脱机渲染 · 零本地负载',
  text: '这是一段由网页代码与微软神经网络语音合成的全新视频。',
  voice: 'zh-CN-YunxiNeural',
  audioFile: 'voiceover.mp3',
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="CloudVideo"
      component={VideoComponent}
      durationInFrames={360}
      fps={30}
      width={1280}
      height={720}
      defaultProps={defaultProps}
      calculateMetadata={async ({ props }) => {
        // If metadata.json has durationInFrames, use it
        const customProps = props as any;
        const durationInFrames = customProps.durationInFrames || 360;
        return {
          durationInFrames,
          fps: customProps.fps || 30,
          width: customProps.width || 1280,
          height: customProps.height || 720,
          props,
        };
      }}
    />
  );
};
