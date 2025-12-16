#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# Lightweight audio preprocessing helpers.

import os

import librosa
import numpy as np
import soundfile as sf


def _to_mono_and_sr(wav, sr, target_sr=16000):
    if wav.ndim > 1:
        wav = wav[0]
    if sr != target_sr:
        wav = librosa.resample(wav, orig_sr=sr, target_sr=target_sr)
        sr = target_sr
    return wav, sr


def _rms_normalize(wav, target_rms=0.1, eps=1e-8):
    rms = np.sqrt(np.mean(np.square(wav)) + eps)
    if rms < eps:
        return wav
    scale = target_rms / rms
    return np.clip(wav * scale, -1.0, 1.0)


def _lufs_normalize(wav, target_lufs=-20.0, eps=1e-9):
    # Approximate integrated loudness using overall power (not true BS.1770)
    power = np.mean(np.square(wav)) + eps
    lufs = 10.0 * np.log10(power)
    gain_db = target_lufs - lufs
    gain = 10 ** (gain_db / 20.0)
    wav = wav * gain
    return np.clip(wav, -1.0, 1.0)


def _highpass_preemphasis(wav, coef=0.97):
    # simple pre-emphasis to attenuate low-frequency/rumble
    if len(wav) < 2:
        return wav
    emphasized = np.append(wav[0], wav[1:] - coef * wav[:-1])
    # avoid overflow
    emphasized = np.clip(emphasized, -1.0, 1.0)
    return emphasized


def _damage_fix(wav):
    # Replace NaN/inf, remove DC, soften clipping
    wav = np.nan_to_num(wav, nan=0.0, posinf=0.0, neginf=0.0)
    # Remove DC offset
    wav = wav - np.mean(wav)
    # Detect hard clipping
    clip_thresh = 0.99
    clipped = np.abs(wav) > clip_thresh
    if clipped.any():
        # Soft-limit to reduce distortion
        wav = np.tanh(wav)
    # Final safety clip
    wav = np.clip(wav, -1.0, 1.0)
    return wav


def _simple_denoise(wav, sr):
    # Spectral gating with noise estimated from low-energy frames
    n_fft = 1024
    hop = 256
    win = 1024
    stft = librosa.stft(wav, n_fft=n_fft, hop_length=hop, win_length=win)
    mag, phase = np.abs(stft), np.exp(1j * np.angle(stft))

    # Identify quiet frames by energy percentile
    frame_energy = np.mean(mag, axis=0)
    quiet_mask = frame_energy < np.percentile(frame_energy, 25)
    if quiet_mask.any():
        noise_profile = np.median(mag[:, quiet_mask], axis=1, keepdims=True)
    else:
        noise_profile = np.median(mag, axis=1, keepdims=True)

    # Build soft mask
    ratio = 1.5
    thresh = noise_profile * ratio
    mask = mag / (thresh + 1e-8)
    mask = np.clip(mask, 0.0, 1.0)
    # Smooth mask
    mask = librosa.decompose.nn_filter(mask, aggregate=np.median, metric="cosine")
    mask = np.clip(mask, 0.0, 1.0)

    stft_denoised = mag * mask * phase
    wav_denoised = librosa.istft(stft_denoised, hop_length=hop, length=len(wav))
    # Final safety clip
    if len(wav_denoised) != len(wav):
        wav_denoised = np.resize(wav_denoised, wav.shape)
    return np.clip(wav_denoised, -1.0, 1.0)


def preprocess_audio_once(file_path,
                          to_16k_mono=False,
                          rms_norm=False,
                          lufs_norm=False,
                          target_lufs=-20.0,
                          highpass=False,
                          denoise=False,
                          damage_fix=False,
                          trim_silence=False,
                          output_dir=None):
    wav, sr = librosa.load(file_path, sr=None, mono=False)
    if damage_fix:
        wav = _damage_fix(wav)
    if to_16k_mono:
        wav, sr = _to_mono_and_sr(wav, sr, target_sr=16000)
    if highpass:
        wav = _highpass_preemphasis(wav)
    if rms_norm:
        wav = _rms_normalize(wav)
    if lufs_norm:
        wav = _lufs_normalize(wav, target_lufs=target_lufs)
    if denoise:
        wav = _simple_denoise(wav, sr)
    if trim_silence:
        wav, _ = librosa.effects.trim(wav, top_db=30)

    base = os.path.basename(file_path)
    pre_name = "pre_" + base
    if output_dir is None:
        output_dir = os.path.dirname(file_path)
    os.makedirs(output_dir, exist_ok=True)
    out_path = os.path.join(output_dir, pre_name)
    sf.write(out_path, wav, sr)
    return out_path
