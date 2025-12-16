#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# Utility script to concatenate multiple videos after light normalization,
# inserting 1s color-gradient transitions between clips.
#
# Usage example:
#   python funclip/multi_video_concat.py --fps 25 --transition-duration 1.0 \
#       examples/a.mp4 examples/b.mkv examples/c.mov

import argparse
import os
from pathlib import Path
from typing import List, Optional, Tuple

import numpy as np
from moviepy.editor import VideoClip, VideoFileClip, concatenate_videoclips


def parse_size(size_str: Optional[str]) -> Optional[Tuple[int, int]]:
    if size_str is None:
        return None
    parts = size_str.lower().replace("x", " ").split()
    if len(parts) != 2:
        raise ValueError("size must look like 1280x720")
    w, h = map(int, parts)
    return (w, h)


def mean_color_at(clip: VideoFileClip, t: float) -> Tuple[int, int, int]:
    frame = clip.get_frame(t)
    color = frame.mean(axis=(0, 1))
    return tuple(int(c) for c in color)


def gradient_transition(
    start_color: Tuple[int, int, int],
    end_color: Tuple[int, int, int],
    size: Tuple[int, int],
    duration: float,
):
    start = np.array(start_color, dtype=float)
    end = np.array(end_color, dtype=float)

    def make_frame(t):
        alpha = np.clip(t / duration, 0.0, 1.0)
        color = (1 - alpha) * start + alpha * end
        frame = np.ones((size[1], size[0], 3), dtype=np.uint8)
        frame[:] = color.astype(np.uint8)
        return frame

    return VideoClip(make_frame=make_frame, duration=duration)


def normalize_clip(
    path: Path,
    target_size: Tuple[int, int],
    target_fps: int,
    target_audio_fps: Optional[int],
) -> VideoFileClip:
    clip = VideoFileClip(str(path))
    if clip.size != list(target_size):
        clip = clip.resize(newsize=target_size)
    clip = clip.set_fps(target_fps)
    if clip.audio is not None and target_audio_fps is not None:
        clip = clip.set_audio(clip.audio.set_fps(target_audio_fps))
    return clip


def build_output_name(inputs: List[Path], output_dir: Path) -> Path:
    bases = [p.stem for p in inputs]
    name = "__".join(bases) + ".mp4"
    return output_dir / name


def concat_videos(
    inputs: List[Path],
    target_size: Optional[Tuple[int, int]],
    target_fps: int,
    target_audio_fps: Optional[int],
    transition_duration: float,
    output_dir: Path,
    overwrite: bool,
) -> Path:
    if not inputs:
        raise ValueError("No input videos provided")
    output_dir.mkdir(parents=True, exist_ok=True)

    # Use first clip as template when target_size is not specified.
    with VideoFileClip(str(inputs[0])) as first_probe:
        base_size = target_size or tuple(first_probe.size)
    clips = []
    for path in inputs:
        clip = normalize_clip(path, base_size, target_fps, target_audio_fps)
        clips.append(clip)

    stitched = []
    for idx, clip in enumerate(clips):
        stitched.append(clip)
        if idx + 1 < len(clips):
            next_clip = clips[idx + 1]
            start_sample_time = max(0.0, clip.duration - 1.0 / max(target_fps, 1))
            start_color = mean_color_at(clip, start_sample_time)
            end_color = mean_color_at(next_clip, 0.0)
            trans = gradient_transition(
                start_color, end_color, base_size, transition_duration
            )
            stitched.append(trans)

    final = concatenate_videoclips(stitched, method="compose")
    output_path = build_output_name(inputs, output_dir)
    if output_path.exists() and not overwrite:
        raise FileExistsError(
            f"{output_path} exists. Use --overwrite to replace the existing file."
        )
    final.write_videofile(
        str(output_path),
        fps=target_fps,
        audio_codec="aac",
    )
    # Close clips to release resources
    for clip in clips:
        clip.close()
    final.close()
    return output_path


def main():
    parser = argparse.ArgumentParser(
        description="Concatenate multiple videos with 1s color-gradient transitions."
    )
    parser.add_argument(
        "videos", nargs="+", help="Paths to video files to concatenate (in order)."
    )
    parser.add_argument(
        "--fps", type=int, default=25, help="Target FPS for all clips and output."
    )
    parser.add_argument(
        "--audio-fps",
        type=int,
        default=44100,
        help="Target audio sampling rate. Set to 0 to disable audio resampling.",
    )
    parser.add_argument(
        "--size",
        type=str,
        default=None,
        help="Target resolution like 1280x720. Defaults to first video's size.",
    )
    parser.add_argument(
        "--transition-duration",
        type=float,
        default=1.0,
        help="Duration (seconds) of the gradient transition between clips.",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="examples",
        help="Directory to store the concatenated output.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite output file if it already exists.",
    )
    args = parser.parse_args()

    video_paths = [Path(v).expanduser().resolve() for v in args.videos]
    output_dir = Path(args.output_dir).expanduser().resolve()
    target_size = parse_size(args.size)
    target_audio_fps = args.audio_fps if args.audio_fps > 0 else None

    output = concat_videos(
        inputs=video_paths,
        target_size=target_size,
        target_fps=args.fps,
        target_audio_fps=target_audio_fps,
        transition_duration=args.transition_duration,
        output_dir=output_dir,
        overwrite=args.overwrite,
    )
    print(f"Saved concatenated video to {output}")


if __name__ == "__main__":
    main()
