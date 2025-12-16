# FunClip 新增特性与用法

## from haoran

### 1) 多视频拼接后再识别/裁剪
- 功能：`--file` 支持逗号分隔的多个视频路径；会自动统一尺寸/FPS/音频采样率，并在视频间插入 1s 颜色渐变过渡，输出到 `examples/` 后再进入识别流程（Stage 1）。Stage 2 依旧对单个文件工作，可用 Stage 1 生成的合并文件。
- 运行示例：
```bash
# Stage 1：多视频拼接 + ASR
python funclip/videoclipper.py --stage 1 \
    --file "a.mp4,b.mkv,c.mov" \
    --output_dir ./output

# Stage 2：对合并后的视频进行裁剪
python funclip/videoclipper.py --stage 2 \
    --file examples/a__b__c.mp4 \
    --output_dir ./output \
    --dest_text "需要裁剪的文本"
```

### 2) 多视频拼接独立脚本
- 功能：`funclip/multi_video_concat.py` 可单独使用，按顺序拼接多视频并插入渐变过渡。
- 运行示例：
```bash
python funclip/multi_video_concat.py \
  --fps 25 --size 1280x720 --transition-duration 1.0 \
  --output-dir examples \
  path/to/a.mp4 path/to/b.mkv path/to/c.mov
# 输出：examples/a__b__c.mp4
```
