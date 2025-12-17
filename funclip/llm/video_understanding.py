import cv2
import numpy as np
import torch
import logging
from PIL import Image
from transformers import AutoModelForImageTextToText, AutoProcessor
from collections import Counter

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ShotDetector:
    def __init__(self, threshold=0.7):
        # 默认阈值
        self.threshold = threshold

    def detect(self, video_path, threshold=None): # [修改] 增加 threshold 参数
        """
        :param threshold: If provided, overrides the default threshold.
        """
        # 使用传入的阈值，如果没有则使用默认值
        eff_threshold = threshold if threshold is not None else self.threshold
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            logger.error(f"Error opening video file {video_path}")
            return []
        
        shots = []
        prev_hist = None
        start_frame = 0
        frame_idx = 0
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        if fps <= 0:
            logger.warning("FPS is 0 or invalid, defaulting to 25.")
            fps = 25
            
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
            hist = cv2.calcHist([hsv], [0], None, [256], [0, 256])
            cv2.normalize(hist, hist, 0, 1, cv2.NORM_MINMAX)
            
            if prev_hist is not None:
                score = cv2.compareHist(prev_hist, hist, cv2.HISTCMP_CORREL)
                
                # [逻辑] 相似度 < 阈值，判定为切分点
                if score < eff_threshold:
                    end_frame = frame_idx
                    shots.append((start_frame / fps, end_frame / fps))
                    start_frame = frame_idx
            
            prev_hist = hist
            frame_idx += 1
            
        shots.append((start_frame / fps, frame_idx / fps))
        cap.release()
        
        # logger.info(f"Detected {len(shots)} shots in {video_path} with threshold {eff_threshold}")
        return shots

class VideoSemanticUnderstander:
    def __init__(self, model_path="/remote-home/share/huggingface/Qwen3-VL-8B-Instruct", device="cuda"):
        """
        Initialize VideoSemanticUnderstander with Qwen-VL model.
        :param model_path: Path or HuggingFace ID of the model.
        :param device: Device to run the model on ('cuda' or 'cpu').
        """
        self.device = device
        logger.info(f"Loading model from {model_path} on {device}...")
        try:
            self.model = AutoModelForImageTextToText.from_pretrained(
                model_path,
                dtype=torch.bfloat16,
                device_map="auto",
                attn_implementation="flash_attention_2"
            )
            self.processor = AutoProcessor.from_pretrained(model_path)
            logger.info("Model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise

    def extract_frame_from_video(self, video_path, timestamp):
        """
        Extract a single frame from video at a specific timestamp.
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return None
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_no = int(timestamp * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
        ret, frame = cap.read()
        cap.release()
        
        if ret:
            return cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        return None

    def _sample_global_frames(self, video_path, num_frames=8):
        """
        [新增] 均匀采样全片帧，用于全局理解
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened(): return []
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames <= 0: return []
        
        # 均匀采样索引
        indices = np.linspace(0, total_frames - 1, num_frames, dtype=int)
        frames = []
        
        for idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if ret:
                frames.append(Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)))
        
        cap.release()
        return frames

    def _generate_global_mood(self, video_path):
        """
        [修正] 第二次 Pass：生成一段关于视频氛围的自然语言描述
        """
        frames = self._sample_global_frames(video_path, num_frames=8)
        if not frames:
            return "A generic video background."

        # 构造多图输入
        content = []
        for img in frames:
            content.append({"type": "image", "image": img})
        
        # [修改] Prompt：要求输出描述性句子，而不是单个词
        prompt = (
            "You are a professional music supervisor. "
            "Look at these frames from a video. "
            "Describe the overall mood, atmosphere, and energy of the video in one brief sentence "
            "to help select the perfect background music. "
            "Focus on the feeling (e.g., relaxing, high energy, melancholic) and the setting."
        )
        content.append({"type": "text", "text": prompt})

        messages = [{"role": "user", "content": content}]
        
        inputs = self.processor.apply_chat_template(
            messages, tokenize=True, add_generation_prompt=True, return_dict=True, return_tensors="pt"
        )
        inputs = inputs.to(self.device)
        
        # 稍微增加长度限制，允许输出一整句
        generated_ids = self.model.generate(**inputs, max_new_tokens=128)
        
        # 截断输入部分
        generated_ids_trimmed = [
            out_ids[len(in_ids) :] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
        ]
        
        output_text = self.processor.batch_decode(
            generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
        )[0]
        
        # [修改] 后处理：保留句子结构
        summary = output_text.strip()
        
        # 去掉 Markdown 格式干扰 (如果模型输出了 **Sad**)
        summary = summary.replace('**', '').replace('"', '')
        
        # 如果模型比较啰嗦，输出了 "The mood is...", 我们保留它，这对语义检索没坏处
        # 只要不是太长（超过200字符）就行
        if len(summary) > 300:
            summary = summary[:300]
            
        logger.info(f"Global Mood Description: {summary}")
        return summary
    
    def understand(self, video_path, shots):
        """
        1. 逐镜头分析 (用于转场和UI详情)
        2. 全局视频分析 (用于配乐检索)
        """
        results = []
        
        # Pass 1: 逐镜头分析 (用于转场决策)
        # 保持原有的详细 Prompt
        shot_prompt = (
            "Analyze this image. Provide tags for: Scene, Event, Weather, Mood. "
            "Format: Scene: ..., Event: ..., Weather: ..., Mood: ..."
        )
        
        logger.info("Pass 1: Analyzing individual shots...")
        for i, (start, end) in enumerate(shots):
            mid_time = (start + end) / 2
            frame_img = self.extract_frame_from_video(video_path, mid_time)
            
            if frame_img is None: continue
            image = Image.fromarray(frame_img)
            
            messages = [{
                "role": "user", 
                "content": [{"type": "image", "image": image}, {"type": "text", "text": shot_prompt}]
            }]
            
            inputs = self.processor.apply_chat_template(
                messages, tokenize=True, add_generation_prompt=True, return_dict=True, return_tensors="pt"
            )
            inputs = inputs.to(self.device)
            
            generated_ids = self.model.generate(**inputs, max_new_tokens=128)
            output_text = self.processor.batch_decode(
                generated_ids, skip_special_tokens=True, clean_up_tokenization_spaces=False
            )[0]
            
            tags = self._parse_tags(output_text)
            logger.info(f"Shot {i}: {tags}")
            
            results.append({
                "start": start,
                "end": end,
                "tags": tags,
                "raw_output": output_text
            })
            
        # Pass 2: 全局分析 (用于配乐)
        logger.info("Pass 2: Analyzing global mood for music...")
        global_mood = self._generate_global_mood(video_path)
        
        # 为了兼容之前的逻辑，我们把 Global Mood 包装成 Summary 格式
        # 这样 MusicManager 可以直接拿去和文件夹名做匹配
        global_summary = global_mood

        logger.info(f"Final Global Summary: {global_summary}")

        return results, global_summary

    def _parse_tags(self, text):
        tags = {}
        # 简单清洗 text，去掉 system message 部分 (如果模型输出了)
        text = text.split("assistant\n")[-1] 
        
        if '\n' in text: parts = text.split('\n')
        else: parts = text.split(',')
        
        for part in parts:
            part = part.strip()
            if ':' in part:
                key, value = part.split(':', 1)
                tags[key.strip()] = value.strip()
        return tags

