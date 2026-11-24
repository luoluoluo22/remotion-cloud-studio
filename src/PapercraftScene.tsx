import React, { useEffect, useRef, useState } from 'react';
import {
  AbsoluteFill, Audio, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';
import * as THREE from 'three';
import { paperSheet, rng, rgba, shade } from './papercraft/lib/paperkit-2d.js';
import {
  PaperPost, boxFold, crossCard, enableSoftShadows, hinge, paperLights, paperMaterial, paperTextures,
} from './papercraft/lib/paperkit-3d.js';
import { FlapSpring, windSway } from './papercraft/lib/paper-motion.js';
import { paintPine, paintTree, shape as countrysideShape } from './papercraft/examples/countryside.js';
import type { VideoProps } from './VideoComponent';

interface HingedItem {
  pivot: THREE.Object3D;
  flap: FlapSpring;
  delay: number;
  baseX: number;
  baseZ: number;
  swayAmp: number;
}

function buildPrintedGroundTexture(): THREE.CanvasTexture {
  const size = 1024;
  const base = paperSheet({ size, color: '#cfc4a1', seed: 12, fibres: 1, mottle: 0.06 });
  const g = base.getContext('2d')!;
  const washes: Array<[number, number, number, string]> = [
    [size * 0.28, size * 0.35, size * 0.34, 'rgba(168, 174, 132, 0.35)'],
    [size * 0.72, size * 0.65, size * 0.36, 'rgba(212, 203, 166, 0.45)'],
    [size * 0.5, size * 0.5, size * 0.25, 'rgba(214, 184, 108, 0.25)'],
  ];
  for (const [cx, cy, r, col] of washes) {
    const grad = g.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
    grad.addColorStop(0, col);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  g.lineCap = 'round';
  g.strokeStyle = rgba('#f3e6c6', 0.92);
  g.lineWidth = size * 0.085;
  g.beginPath();
  g.moveTo(size * 0.15, size * 0.95);
  g.bezierCurveTo(size * 0.38, size * 0.72, size * 0.64, size * 0.52, size * 0.5, size * 0.3);
  g.bezierCurveTo(size * 0.42, size * 0.18, size * 0.58, size * 0.08, size * 0.78, 0);
  g.stroke();
  g.strokeStyle = rgba(shade('#cfc4a1', -0.25), 0.35);
  g.lineWidth = size * 0.008;
  g.stroke();
  g.strokeStyle = '#f2e6c6';
  g.lineWidth = size * 0.09;
  g.beginPath();
  g.moveTo(0, size * 0.36);
  g.bezierCurveTo(size * 0.26, size * 0.44, size * 0.42, size * 0.7, size * 0.85, size * 0.86);
  g.stroke();
  g.strokeStyle = '#46aa9e';
  g.lineWidth = size * 0.068;
  g.stroke();
  const tex = new THREE.CanvasTexture(base);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
export const PapercraftScene: React.FC<VideoProps> = ({
  title = 'AI 自动化云端视频工作台',
  subtitle = 'GitHub Actions 云端 3D 折纸立体书渲染',
  text = '欢迎体验基于 Three.js 与 Papercraft 的 9:16 竖屏折纸立体书模板。',
  audioFile = 'voiceover.mp3',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [handle] = useState(() => delayRender('Initializing Papercraft 3D Scene'));
  const engineRef = useRef<{
    renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera;
    post: PaperPost; hinged: HingedItem[];
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#c9b27e');
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.5, 160);
    camera.position.set(8, 17, 21);
    camera.lookAt(0, 1.2, -0.5);
    const paper = paperTextures(renderer, { color: '#f6efe2', seed: 7, unitsPerTile: 6 });
    const lights = paperLights(scene, { shadowExtent: 24, mapSize: 1024, distance: 50 });
    enableSoftShadows(lights.key, { softness: 0.24, blockerSamples: 8, filterSamples: 12 });
    const groundMat = paperMaterial({ map: buildPrintedGroundTexture(), normalMap: paper.normalMap, normalScale: 0.25 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(52, 52), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    const hinged: HingedItem[] = [];
    const addPopUp = (obj: THREE.Object3D, x: number, z: number, yaw: number, delay: number, size: number, swayAmp = 0.025, seed = 1) => {
      const h = hinge(obj, { at: new THREE.Vector3(x, 0, z), yaw, open: 0, size, delay });
      scene.add(h.pivot);
      hinged.push({ pivot: h.pivot, flap: new FlapSpring({ p: 0, size, jitter: (seed % 5) - 2 }), delay, baseX: x, baseZ: z, swayAmp });
    };
    const cottage = boxFold({
      w: 4.4, d: 3.4, wallH: 2.5, roofH: 1.7, overhang: 0.25, paper, seed: 11,
      paints: { wall: '#ecd4b0', roof: '#c8513b', door: '#3f7a70', window: '#ffc45a' },
    });
    addPopUp(cottage, 0, -1.2, 0.28, 0.15, 0.65, 0, 11);
    const treeSpecs: Array<[number, number, number, 'tree' | 'pine', number]> = [
      [-4.6, -2.8, 0.2, 'pine', 1], [-5.8, 1.2, -0.4, 'tree', 2], [-2.8, -5.2, 0.6, 'tree', 3],
      [4.5, -3.5, -0.3, 'pine', 4], [5.2, 0.8, 0.5, 'tree', 5], [3.2, 4.2, -0.7, 'pine', 6],
      [-3.4, 4.6, 0.3, 'tree', 7], [0.6, -6.4, 0.1, 'pine', 8], [-6.8, -5.5, -0.2, 'pine', 9],
      [6.5, -6.2, 0.4, 'tree', 10], [6.4, 3.8, -0.5, 'pine', 12], [-6.2, 5.2, 0.2, 'tree', 13],
    ];
    const treeColors = { canopy: '#e0852c', accent: '#c9542b', trunk: '#74452a', leaf: '#d9a03a' };
    const pineColors = { needle: '#62803f', deep: '#3f8a74', trunk: '#74452a', highlight: '#8a9c55' };
    treeSpecs.forEach(([x, z, yaw, kind, seed], idx) => {
      const r = rng(seed * 31 + 7);
      const pts = kind === 'pine' ? countrysideShape.pine(r, { w: 2.5, h: 4.4 }) : countrysideShape.tree(r, { w: 2.9, h: 4.2 });
      const paint = kind === 'pine' ? paintPine(pineColors, { tiers: 4 }) : paintTree(treeColors, { leaves: 18, branches: 4 });
      addPopUp(crossCard(pts, { paint, paper, seed: seed * 17 }), x, z, yaw, 0.35 + idx * 0.08, 0.42, 0.035, seed);
    });
    const post = new PaperPost(renderer, scene, camera, { taps: 12 });
    post.setSize(width, height);
    post.bandScale = 1.25;
    post.focus.set(0, 1.2, -0.5);
    engineRef.current = { renderer, scene, camera, post, hinged };
    continueRender(handle);
    return () => { renderer.dispose(); };
  }, [handle, height, width]);

  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;
    const t = frame / fps;
    const progress = Math.min(1, frame / Math.max(1, durationInFrames - 1));
    const stepDt = 1 / 60;
    for (const item of eng.hinged) {
      item.flap.reset(0);
      if (t > item.delay) {
        item.flap.set(1);
        const steps = Math.max(1, Math.round(Math.min(t - item.delay, 3.0) / stepDt));
        for (let s = 0; s < steps; s++) item.flap.step(stepDt);
      }
      const openAngle = (-Math.PI / 2 + 0.01) * (1 - item.flap.p);
      const sway = item.swayAmp > 0 ? windSway(t, item.baseX, item.baseZ, { amp: item.swayAmp }) : 0;
      item.pivot.rotation.x = openAngle + sway;
    }
    const angle = interpolate(progress, [0, 1], [0.36, -0.24]);
    const radius = interpolate(progress, [0, 1], [23, 18.5]);
    const camY = interpolate(progress, [0, 1], [17.5, 13.8]);
    eng.camera.position.set(Math.sin(angle) * radius, camY, Math.cos(angle) * radius);
    eng.camera.lookAt(0, 1.2, -0.8);
    eng.post.focus.set(0, 1.2, -0.8);
    eng.post.render(t);
  }, [durationInFrames, fps, frame]);
  const titleSpring = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  const textSpring = spring({ frame: frame - 18, fps, config: { damping: 15 } });
  const shortText = text.length > 80 ? `${text.slice(0, 80)}...` : text;
  return (
    <AbsoluteFill style={{ backgroundColor: '#c9b27e' }}>
      <canvas ref={canvasRef} width={width} height={height} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div style={{
        position: 'absolute', top: 96, left: 64, right: 64,
        transform: `translateY(${interpolate(titleSpring, [0, 1], [-40, 0])}px)`, opacity: titleSpring,
        backgroundColor: 'rgba(246, 239, 226, 0.92)', border: '3px solid #74452a', borderRadius: 18,
        padding: '28px 34px', boxShadow: '0 14px 32px rgba(58, 36, 18, 0.24)',
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.08em', color: '#c8513b', marginBottom: 10 }}>
          PAPERCRAFT 3D · 折纸立体书
        </div>
        <div style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.25, color: '#3a2412' }}>{title}</div>
        {subtitle ? <div style={{ marginTop: 10, fontSize: 26, fontWeight: 500, color: '#6b492c' }}>{subtitle}</div> : null}
      </div>
      <div style={{
        position: 'absolute', bottom: 130, left: 64, right: 64,
        transform: `translateY(${interpolate(textSpring, [0, 1], [35, 0])}px)`, opacity: textSpring,
        backgroundColor: 'rgba(58, 36, 18, 0.86)', border: '2px solid rgba(246, 239, 226, 0.5)', borderRadius: 16,
        padding: '24px 30px', boxShadow: '0 12px 28px rgba(0, 0, 0, 0.28)',
      }}>
        <div style={{ fontSize: 32, lineHeight: 1.5, color: '#f6efe2', fontWeight: 600 }}>{shortText}</div>
      </div>
      {audioFile ? <Audio src={staticFile(audioFile)} /> : null}
    </AbsoluteFill>
  );
};
