import logging
import sys
import os

# Add the current directory to sys.path so we can import funclip modules
sys.path.append("/remote-home/haoningwu/xiaohuang/FunClip")

from funclip.videoclipper import VideoClipper

# Mock logging to see output
logging.basicConfig(level=logging.INFO)

def test_integration():
    print("Testing VideoClipper integration...")
    # Initialize VideoClipper with None for funasr_model as we are not testing ASR
    clipper = VideoClipper(funasr_model=None)
    
    # Initialize semantic understander
    model_path = "/remote-home/share/huggingface/Qwen3-VL-8B-Instruct"
    print(f"Initializing semantic understander with {model_path}...")
    clipper.init_semantic_understander(model_path)
    
    # Test on video
    video_path = "/remote-home/haoningwu/xiaohuang/FunClip/test_video.mp4"
    print(f"Running semantic understanding on {video_path}...")
    result = clipper.semantic_understand(video_path)
    
    print("\nResult:")
    print(result)
    
    if "Shot" in result:
        print("\nSUCCESS: Semantic tags extracted.")
    else:
        print("\nFAILURE: Unexpected output.")

if __name__ == "__main__":
    test_integration()
