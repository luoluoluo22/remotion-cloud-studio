import React from "react";
import {
  AbsoluteFill,
  Audio,
  Composition,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { UnifiedCaptionOverlay } from "./UnifiedCaptionOverlay";
import { getStoryboardSlideIndexAtTime } from "./storyboardTimeline.mjs";

import hedgehogCaptionJson from "../../public/gif-story/20261110-animal-hedgehog-v002/alignment.json";
import hedgehogStoryboardJson from "../../public/gif-story/20261110-animal-hedgehog-v002/storyboard-slides.json";
import elephantCaptionJson from "../../public/gif-story/20261110-animal-elephant-v002/alignment.json";
import elephantStoryboardJson from "../../public/gif-story/20261110-animal-elephant-v002/storyboard-slides.json";
import foxCaptionJson from "../../public/gif-story/20261110-animal-fox-v002/alignment.json";
import foxStoryboardJson from "../../public/gif-story/20261110-animal-fox-v002/storyboard-slides.json";

type CharacterTiming = { character: string; start: number; end: number };
type CaptionData = {
  text: string;
  duration: number;
  goldenQuote: string;
  characterTimings: CharacterTiming[];
  sentences: Array<{ text: string; start: number; end: number; characters: CharacterTiming[] }>;
  scenes: Array<{ id: string; label: string; start: number; end: number }>;
};
type StorySlide = {
  id: string;
  scene: string;
  image: string;
  sourceFrame: string;
  start: number;
  end: number;
};
type Storyboard = { slides: StorySlide[]; durationSeconds: number; transition: string };
type AudioProps = { voiceFile: string; musicFile: string; musicVolume: number };
type Props = {
  audio: AudioProps;
  captionData: CaptionData;
  storyboard: Storyboard;
  sceneTransition: "pageFlip" | "paperSlide" | "cloudReveal";
  background: string;
};

const FPS = 30;
const ZOOM_FROM = 1;
const ZOOM_TO = 1.045;
const TRANSITION_FRAMES = 12;

const StorySlideVisual: React.FC<{
  slide: StorySlide;
  zoom: number;
  background: string;
  panX: number;
  panY: number;
  tilt: number;
}> = ({ slide, zoom, background, panX, panY, tilt }) => {
  const src = staticFile(slide.image);
  return (
    <AbsoluteFill style={{ backgroundColor: background, overflow: "hidden" }}>
      <Img
        src={src}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "blur(32px) brightness(0.58) saturate(0.88)",
          transform: "scale(1.14)",
        }}
      />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            transform: "translate3d(" + panX + "px, " + panY + "px, 0) scale(" + zoom + ") rotate(" + tilt + "deg)",
            filter: "drop-shadow(0 10px 18px rgba(24,16,10,0.18))",
            transformOrigin: "center center",
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const AnimalFableVideo: React.FC<Props> = ({ audio, captionData, storyboard, sceneTransition, background }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const slides = storyboard.slides;
  const slideIndex = getStoryboardSlideIndexAtTime(slides, time);
  const slide = slides[slideIndex];
  const previous = slides[Math.max(0, slideIndex - 1)];
  const slideStartFrame = Math.round(slide.start * fps);
  const slideFrames = Math.max(1, Math.round((slide.end - slide.start) * fps));
  const localFrame = Math.max(0, frame - slideStartFrame);
  const progress = Math.min(1, Math.max(0, localFrame / Math.max(1, slideFrames - 1)));
  const zoom = interpolate(progress, [0, 1], [ZOOM_FROM, ZOOM_TO], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const transitionProgress = interpolate(localFrame, [0, TRANSITION_FRAMES], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const isTransitioning = slideIndex > 0 && localFrame < TRANSITION_FRAMES;
  // Subtle foreground drift and slow push, adapted from the MIT-licensed layered-collage motion approach.
  const driftPhase = localFrame / Math.max(1, slideFrames - 1);
  const panX = Math.sin(driftPhase * Math.PI * 2 + slideIndex * 0.61) * 7;
  const panY = Math.cos(driftPhase * Math.PI * 2 + slideIndex * 0.47) * 3;
  const tilt = Math.sin(driftPhase * Math.PI * 2 + slideIndex * 0.73) * 0.22;

  let enteringStyle: React.CSSProperties = {};
  if (sceneTransition === "pageFlip") {
    enteringStyle = {
      transform: "perspective(1600px) rotateY(" + ((1 - transitionProgress) * -82) + "deg)",
      transformOrigin: "left center",
      backfaceVisibility: "hidden",
      boxShadow: "18px 0 42px rgba(0,0,0," + ((1 - transitionProgress) * 0.26) + ")",
    };
  } else if (sceneTransition === "paperSlide") {
    enteringStyle = {
      transform: "translateX(" + ((1 - transitionProgress) * 105) + "%)",
      boxShadow: "-18px 0 36px rgba(0,0,0," + ((1 - transitionProgress) * 0.18) + ")",
    };
  } else {
    enteringStyle = {
      clipPath: "circle(" + Math.max(1, transitionProgress * 155) + "% at 50% 50%)",
    };
  }

  return (
    <AbsoluteFill style={{ backgroundColor: background, overflow: "hidden" }}>
      {isTransitioning ? (
        <>
          <StorySlideVisual slide={previous} zoom={1.015} background={background} panX={0} panY={0} tilt={0} />
          <AbsoluteFill style={enteringStyle}>
            <StorySlideVisual slide={slide} zoom={zoom} background={background} panX={panX} panY={panY} tilt={tilt} />
          </AbsoluteFill>
        </>
      ) : (
        <StorySlideVisual slide={slide} zoom={zoom} background={background} panX={panX} panY={panY} tilt={tilt} />
      )}
      <UnifiedCaptionOverlay data={captionData} time={time} />
      <Audio src={staticFile(audio.voiceFile)} volume={1} />
      <Audio src={staticFile(audio.musicFile)} volume={audio.musicVolume} />
    </AbsoluteFill>
  );
};

const hedgehogCaption = hedgehogCaptionJson as unknown as CaptionData;
const hedgehogStoryboard = hedgehogStoryboardJson as unknown as Storyboard;
const elephantCaption = elephantCaptionJson as unknown as CaptionData;
const elephantStoryboard = elephantStoryboardJson as unknown as Storyboard;
const foxCaption = foxCaptionJson as unknown as CaptionData;
const foxStoryboard = foxStoryboardJson as unknown as Storyboard;

const HEDGEHOG_PROPS: Props = {
  audio: {
    voiceFile: "gif-story/20261110-animal-hedgehog-v002/voiceover.mp3",
    musicFile: "gif-story/20261110-animal-hedgehog-v002/background-music.mp3",
    musicVolume: 0.14,
  },
  captionData: hedgehogCaption,
  storyboard: hedgehogStoryboard,
  sceneTransition: "pageFlip",
  background: "#332c27",
};
const ELEPHANT_PROPS: Props = {
  audio: {
    voiceFile: "gif-story/20261110-animal-elephant-v002/voiceover.mp3",
    musicFile: "gif-story/20261110-animal-elephant-v002/background-music.mp3",
    musicVolume: 0.15,
  },
  captionData: elephantCaption,
  storyboard: elephantStoryboard,
  sceneTransition: "paperSlide",
  background: "#302e29",
};
const FOX_PROPS: Props = {
  audio: {
    voiceFile: "gif-story/20261110-animal-fox-v002/voiceover.mp3",
    musicFile: "gif-story/20261110-animal-fox-v002/background-music.mp3",
    musicVolume: 0.13,
  },
  captionData: foxCaption,
  storyboard: foxStoryboard,
  sceneTransition: "cloudReveal",
  background: "#342a25",
};

export const AnimalFablesCompositions: React.FC = () => (
  <>
    <Composition
      id="AnimalFableHedgehog"
      component={AnimalFableVideo}
      durationInFrames={Math.ceil(hedgehogCaption.duration * FPS)}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={HEDGEHOG_PROPS}
    />
    <Composition
      id="AnimalFableElephant"
      component={AnimalFableVideo}
      durationInFrames={Math.ceil(elephantCaption.duration * FPS)}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={ELEPHANT_PROPS}
    />
    <Composition
      id="AnimalFableFox"
      component={AnimalFableVideo}
      durationInFrames={Math.ceil(foxCaption.duration * FPS)}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={FOX_PROPS}
    />
    <Composition
      id="AnimalFableBatch"
      component={AnimalFableVideo}
      durationInFrames={1800}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={FOX_PROPS}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.max(1, Math.ceil(Number(props.captionData.duration || 1) * FPS)),
      })}
    />
  </>
);
