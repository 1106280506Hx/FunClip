# FunClip 新增特性与用法

> haoran

本文档补充说明 FunClip 在多视频处理与音视频预处理方面的新增能力，并给出常见使用示例。整体设计目标是：**在不改变原有使用习惯的前提下，提高复杂素材（多段视频、音频质量不一致等）的可用性与稳定性**。

---

## 1) 多视频拼接后再进行识别 / 裁剪

**功能说明**

* `--file` 现支持使用英文逗号分隔多个视频文件
* Stage 1 会自动完成：

  * 视频尺寸、FPS、音频采样率的统一
  * 在相邻视频之间插入 1 秒颜色渐变过渡
  * 生成合并后的视频文件（默认输出到 `examples/`）并进入识别流程
* Stage 2 仍然只接受单个视频文件，但可以直接使用 Stage 1 生成的合并结果

**示例**

```bash
# Stage 1：多视频拼接 + 预处理 + 识别
python funclip/videoclipper.py --stage 1 \
  --file "a.mp4,b.mkv,c.mov" \
  --output_dir ./output \
  --std_fps 25 --std_size 1280x720 --pre_audio_16k_mono

# Stage 2：基于合并后的视频进行裁剪
python funclip/videoclipper.py --stage 2 \
  --file examples/a__b__c.mp4 \
  --output_dir ./output \
  --dest_text "需要裁剪的文本"
```

---

## 2) 预处理选项：统一视频 FPS / 分辨率

在 Stage 1 中可以按需开启视频规格统一，避免下游模型或 ffmpeg 处理不稳定。

* **统一 FPS**

```bash
python funclip/videoclipper.py --stage 1 --file a.mp4 \
  --output_dir ./output --std_fps 25
```

* **统一分辨率**

```bash
python funclip/videoclipper.py --stage 1 --file a.mp4 \
  --output_dir ./output --std_size 1280x720
```

---

## 3) 预处理选项：音频转为 16kHz 单声道

适用于语音识别模型对输入格式有明确要求的场景。

```bash
python funclip/videoclipper.py --stage 1 --file a.mp4 \
  --output_dir ./output --pre_audio_16k_mono
```

---

## 4) 预处理选项：音频 RMS 归一化 / 高通预加重

* **RMS 归一化**：缓解不同视频间音量差异
* **高通预加重**：削弱低频噪声（如风噪、环境轰鸣）

```bash
# RMS 归一化
python funclip/videoclipper.py --stage 1 --file a.mp4 \
  --output_dir ./output --pre_audio_rms_norm

# 高通预加重
python funclip/videoclipper.py --stage 1 --file a.mp4 \
  --output_dir ./output --pre_audio_highpass
```

---

## 5) 预处理选项：音频降噪 / 损坏修复

* **轻量级降噪**：适合日常录音、会议视频等场景
* **基础损坏修复**：处理 NaN / inf / 削波等异常问题

```bash
# 轻量降噪
python funclip/videoclipper.py --stage 1 --file a.mp4 \
  --output_dir ./output --pre_audio_denoise

# 损坏修复
python funclip/videoclipper.py --stage 1 --file a.mp4 \
  --output_dir ./output --pre_audio_damage_fix
```

---

## 6) 预处理选项：LUFS 归一化 / 静音裁剪

* **LUFS 归一化**：近似响度对齐（默认目标为 -20 LUFS）
* **静音裁剪**：自动移除长时间静音片段

```bash
# LUFS 归一化
python funclip/videoclipper.py --stage 1 --file a.mp4 \
  --output_dir ./output --pre_audio_lufs_norm \
  --pre_audio_target_lufs -20

# 静音裁剪
python funclip/videoclipper.py --stage 1 --file a.mp4 \
  --output_dir ./output --pre_audio_trim_silence
```

---

## 7) 视频重编码 / CFR / 码率控制（依赖 ffmpeg）

在需要保证编码一致性或适配特定播放环境时可开启。

* **强制 H.264 + CFR**

```bash
python funclip/videoclipper.py --stage 1 --file a.mp4 \
  --output_dir ./output --pre_video_h264 --pre_video_cfr --std_fps 25
```

* **指定视频码率**

```bash
python funclip/videoclipper.py --stage 1 --file a.mp4 \
  --output_dir ./output --pre_video_h264 --pre_video_bitrate 2M
```

---

## 8) 多视频拼接独立脚本

如仅需要做多视频拼接（不进入 FunClip 主流程），可直接使用独立脚本：`funclip/multi_video_concat.py`。

**功能特点**

* 按给定顺序拼接多个视频
* 自动插入颜色渐变过渡
* 可指定输出 FPS、分辨率与过渡时长

**示例**

```bash
python funclip/multi_video_concat.py \
  --fps 25 --size 1280x720 --transition-duration 1.0 \
  --output-dir examples \
  path/to/a.mp4 path/to/b.mkv path/to/c.mov

# 输出文件：examples/a__b__c.mp4
```