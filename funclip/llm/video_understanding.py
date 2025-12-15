import cv2
import numpy as np
import torch
import logging
from PIL import Image
from transformers import AutoModelForImageTextToText, AutoProcessor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ShotDetector:
    def __init__(self, threshold=0.7):
        """
        Initialize ShotDetector with a threshold for histogram comparison.
        :param threshold: Threshold for histogram correlation. Lower value means more sensitivity to change.
                          Correlation 1.0 means identical. < threshold means scene change.
        """
        self.threshold = threshold

    def detect(self, video_path):
        """
        Detect shots in a video using histogram comparison.
        :param video_path: Path to the video file.
        :return: List of tuples (start_time, end_time) in seconds.
        """
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
            
            # Convert to HSV for better color handling
            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
            # Calculate histogram
            hist = cv2.calcHist([hsv], [0], None, [256], [0, 256])
            cv2.normalize(hist, hist, 0, 1, cv2.NORM_MINMAX)
            
            if prev_hist is not None:
                # Compare histograms
                score = cv2.compareHist(prev_hist, hist, cv2.HISTCMP_CORREL)
                
                # If correlation is low, it's a scene change
                if score < self.threshold:
                    end_frame = frame_idx
                    shots.append((start_frame / fps, end_frame / fps))
                    start_frame = frame_idx
            
            prev_hist = hist
            frame_idx += 1
            
        # Add the last shot
        shots.append((start_frame / fps, frame_idx / fps))
        cap.release()
        
        logger.info(f"Detected {len(shots)} shots in {video_path}")
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
                torch_dtype="auto",
                device_map="auto"
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

    def understand(self, video_path, shots):
        """
        Extract semantic tags for each shot.
        :param video_path: Path to the video file.
        :param shots: List of (start, end) timestamps.
        :return: List of dictionaries containing tags.
        """
        results = []
        
        prompt_text = "Analyze this image and provide the following tags: Scene, Event, Weather, Emotion. Format the output as: Scene: ..., Event: ..., Weather: ..., Emotion: ..."
        
        for i, (start, end) in enumerate(shots):
            # Use the middle frame of the shot
            mid_time = (start + end) / 2
            frame_img = self.extract_frame_from_video(video_path, mid_time)
            
            if frame_img is None:
                logger.warning(f"Could not extract frame at {mid_time}s")
                results.append({
                    "start": start,
                    "end": end,
                    "tags": {}
                })
                continue
            
            # Convert to PIL Image
            image = Image.fromarray(frame_img)
            
            # Prepare inputs
            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image", 
                            "image": image,
                        },
                        {"type": "text", "text": prompt_text},
                    ],
                }
            ]
            
            # Process inputs
            inputs = self.processor.apply_chat_template(
                messages, 
                tokenize=True, 
                add_generation_prompt=True,
                return_dict=True, 
                return_tensors="pt" 
            )
            inputs = inputs.to(self.device)
            
            # Generate
            generated_ids = self.model.generate(**inputs, max_new_tokens=128)
            generated_ids_trimmed = [
                out_ids[len(in_ids) :] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
            ]
            output_text = self.processor.batch_decode(
                generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
            )[0]
            
            # Parse output
            tags = self._parse_tags(output_text)
            
            logger.info(f"Shot {i}: {start:.2f}-{end:.2f}s -> {tags}")
            
            results.append({
                "start": start,
                "end": end,
                "tags": tags,
                "raw_output": output_text
            })
            
        return results

    def _parse_tags(self, text):
        """
        Parse the model output to extract tags.
        Expected format: Scene: ..., Event: ..., Weather: ..., Emotion: ...
        or with newlines.
        """
        tags = {}
        # Normalize newlines to commas for easier splitting, or split by lines
        # First try splitting by newlines if present
        if '\n' in text:
            parts = text.split('\n')
        else:
            parts = text.split(',')
            
        for part in parts:
            part = part.strip()
            if not part:
                continue
            if ':' in part:
                key, value = part.split(':', 1)
                tags[key.strip()] = value.strip()
            else:
                # Handle case where split might be imperfect or format is slightly off
                pass
        return tags

