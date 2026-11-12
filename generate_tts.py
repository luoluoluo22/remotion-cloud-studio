#!/usr/bin/env python3
import argparse
import asyncio
import json
import os
import subprocess
import sys

async def generate_audio(text: str, voice: str, output_path: str):
    import edge_tts
    comm = edge_tts.Communicate(text, voice)
    await comm.save(output_path)

def get_audio_duration(file_path: str) -> float:
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        file_path
    ]
    try:
        out = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode().strip()
        return float(out)
    except Exception as e:
        print(f"Warning: ffprobe failed ({e}), using fallback duration estimate.")
        # Rough fallback: ~4 characters per second in Chinese speech
        return max(5.0, len(text) / 4.0)

def main():
    parser = argparse.ArgumentParser(description="Generate TTS audio and Remotion metadata")
    parser.add_argument("--text", required=True, help="Voiceover text")
    parser.add_argument("--voice", default="zh-CN-YunxiNeural", help="Edge-TTS voice identifier")
    parser.add_argument("--title", default="AI 自动化视频生产平台", help="Video main title")
    parser.add_argument("--subtitle", default="云端极速脱机渲染 · 零人工剪辑", help="Video subtitle")
    parser.add_argument("--output-dir", default="public", help="Output directory")
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)
    audio_path = os.path.join(args.output_dir, "voiceover.mp3")

    print(f"🎙️ Generating TTS audio with voice: {args.voice}...")
    asyncio.run(generate_audio(args.text, args.voice, audio_path))

    duration_sec = get_audio_duration(audio_path)
    fps = 30
    # Add 45 frames (1.5s) padding at the end for smooth fadeout
    duration_frames = max(150, int(duration_sec * fps) + 45)

    metadata = {
        "title": args.title,
        "subtitle": args.subtitle,
        "text": args.text,
        "voice": args.voice,
        "audioFile": "voiceover.mp3",
        "durationInSeconds": round(duration_sec, 2),
        "durationInFrames": duration_frames,
        "fps": fps,
        "width": 1280,
        "height": 720
    }

    metadata_path = os.path.join(args.output_dir, "metadata.json")
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    print(f"✅ Audio generated: {audio_path} ({duration_sec:.2f}s)")
    print(f"📄 Metadata written: {metadata_path} -> Total frames: {duration_frames} ({duration_frames/fps:.1f}s)")

if __name__ == "__main__":
    main()
