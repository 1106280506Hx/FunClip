#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# Lightweight video preprocessing helpers.

import os
from pathlib import Path

import moviepy.editor as mpy
from moviepy.editor import AudioFileClip


def parse_size(size_str):
    if size_str is None or not len(str(size_str).strip()):
        return None
    _str = size_str.lower().replace("x", " ").split()
    if len(_str) != 2:
        raise ValueError("size must look like 1280x720")
    return (int(_str[0]), int(_str[1]))


def preprocess_video_once(file_path,
                          target_fps=None,
                          target_size=None,
                          to_16k_mono=False,
                          force_h264=False,
                          target_bitrate=None,
                          force_cfr=False,
                          output_dir=None):
    clip = mpy.VideoFileClip(file_path)
    if target_size is not None and clip.size != list(target_size):
        clip = clip.resize(newsize=target_size)
    if target_fps is not None:
        clip = clip.set_fps(target_fps)
    elif force_cfr:
        # if CFR requested but fps not specified, use source fps rounded
        target_fps = round(clip.fps)
        clip = clip.set_fps(target_fps)
    if to_16k_mono and clip.audio is not None:
        temp_audio = file_path + ".tmp.wav"
        clip.audio.write_audiofile(temp_audio, fps=16000, nbytes=2, codec="pcm_s16le", ffmpeg_params=["-ac", "1"])
        new_audio = AudioFileClip(temp_audio)
        clip = clip.set_audio(new_audio)
    base = os.path.basename(file_path)
    pre_name = "pre_" + base
    if output_dir is None:
        output_dir = os.path.dirname(file_path)
    os.makedirs(output_dir, exist_ok=True)
    out_path = os.path.join(output_dir, pre_name)
    write_kwargs = {
        "fps": target_fps or clip.fps,
        "audio_codec": "aac",
    }
    if force_h264:
        write_kwargs["codec"] = "libx264"
    if target_bitrate:
        write_kwargs["bitrate"] = target_bitrate
    clip.write_videofile(out_path, **write_kwargs)
    clip.close()
    return out_path
