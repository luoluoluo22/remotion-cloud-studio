import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig, Audio, staticFile } from 'remotion';

export interface VideoProps {
  title?: string;
  subtitle?: string;
  text?: string;
  voice?: string;
  audioFile?: string;
}

export const VideoComponent: React.FC<VideoProps> = ({
  title = 'AI 自动化云端视频工作台',
  subtitle = 'GitHub Actions 自动脱机渲染 · 零本地负载',
  text = '这是一段由网页代码与微软神经网络语音合成的全新视频。',
  voice = 'zh-CN-YunxiNeural',
  audioFile = 'voiceover.mp3',
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // Springs for elements
  const titleSpring = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  const cardSpring = spring({ frame: frame - 25, fps, config: { damping: 14 } });
  const textCardSpring = spring({ frame: frame - 45, fps, config: { damping: 15 } });

  // Floating ambient glow coordinates
  const orb1Y = Math.sin(frame * 0.035) * 50;
  const orb2X = Math.cos(frame * 0.025) * 60;

  // Split text into lines or render preview
  const shortText = text.length > 70 ? text.slice(0, 70) + '...' : text;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#0a0d18',
        color: '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Background Animated Gradient Mesh */}
      <div
        style={{
          position: 'absolute',
          top: `calc(10% + ${orb1Y}px)`,
          left: '18%',
          width: 550,
          height: 550,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, rgba(99, 102, 241, 0) 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '8%',
          right: `calc(15% + ${orb2X}px)`,
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.22) 0%, rgba(236, 72, 153, 0) 70%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '40%',
          right: '25%',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.2) 0%, rgba(14, 165, 233, 0) 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Floating Badge */}
      <div
        style={{
          transform: `scale(${titleSpring})`,
          opacity: interpolate(frame, [0, 20], [0, 1]),
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 24px',
          borderRadius: 40,
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(12px)',
          fontSize: 18,
          fontWeight: 600,
          color: '#38bdf8',
          marginBottom: 20,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        <span style={{ fontSize: 20 }}>⚡</span>
        GitHub Actions × Remotion 云端脱机流水线
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#10b981',
            boxShadow: '0 0 10px #10b981',
          }}
        />
      </div>

      {/* Main Title */}
      <div
        style={{
          transform: `scale(${titleSpring}) translateY(${interpolate(titleSpring, [0, 1], [40, 0])}px)`,
          opacity: titleSpring,
          fontSize: 54,
          fontWeight: 800,
          letterSpacing: '-1px',
          background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textAlign: 'center',
          marginBottom: 12,
        }}
      >
        {title}
      </div>

      {/* Subtitle */}
      <div
        style={{
          opacity: interpolate(frame, [15, 35], [0, 1], { extrapolateRight: 'clamp' }),
          fontSize: 22,
          color: '#94a3b8',
          fontWeight: 400,
          marginBottom: 36,
        }}
      >
        {subtitle}
      </div>

      {/* Content Script Quote Box */}
      <div
        style={{
          width: '78%',
          maxWidth: 1000,
          transform: `scale(${Math.max(0, textCardSpring)}) translateY(${interpolate(textCardSpring, [0, 1], [40, 0])}px)`,
          opacity: Math.max(0, Math.min(1, textCardSpring)),
          background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.85) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          borderRadius: 20,
          padding: '24px 32px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)',
          marginBottom: 36,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, color: '#38bdf8', fontWeight: 600 }}>
          <span>🎙️ 正在播报</span>
          <span style={{ color: '#64748b' }}>•</span>
          <span style={{ color: '#cbd5e1' }}>音色: {voice}</span>
        </div>
        <div
          style={{
            fontSize: 22,
            color: '#f8fafc',
            lineHeight: 1.6,
            fontWeight: 500,
          }}
        >
          “ {shortText} ”
        </div>
      </div>

      {/* 3 Interactive Feature Pills */}
      <div
        style={{
          display: 'flex',
          gap: 20,
          justifyContent: 'center',
          marginBottom: 36,
          opacity: interpolate(frame, [40, 60], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        <div
          style={{
            padding: '10px 20px',
            borderRadius: 14,
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            fontSize: 16,
            color: '#cbd5e1',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>🌐</span> 网页端一键点击触发
        </div>
        <div
          style={{
            padding: '10px 20px',
            borderRadius: 14,
            background: 'rgba(236, 72, 153, 0.15)',
            border: '1px solid rgba(236, 72, 153, 0.3)',
            fontSize: 16,
            color: '#cbd5e1',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>☁️</span> GitHub Actions 免费 CI/CD
        </div>
        <div
          style={{
            padding: '10px 20px',
            borderRadius: 14,
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            fontSize: 16,
            color: '#cbd5e1',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>🎬</span> 1080P/720P 极速出片
        </div>
      </div>

      {/* Dynamic Sound Wave Spectrum Bars */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 6,
          height: 50,
          marginBottom: 30,
        }}
      >
        {Array.from({ length: 32 }).map((_, i) => {
          const barHeight = Math.sin(frame * 0.18 + i * 0.45) * 18 + 24;
          return (
            <div
              key={i}
              style={{
                width: 6,
                height: `${barHeight}px`,
                borderRadius: 4,
                background: `linear-gradient(180deg, #38bdf8 0%, #818cf8 50%, #ec4899 100%)`,
                opacity: 0.85,
              }}
            />
          );
        })}
      </div>

      {/* Bottom Progress Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: 6,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${(frame / durationInFrames) * 100}%`,
            background: 'linear-gradient(90deg, #38bdf8, #818cf8, #ec4899)',
          }}
        />
      </div>

      {/* Synchronized Audio */}
      <Audio src={staticFile(audioFile)} />
    </div>
  );
};
