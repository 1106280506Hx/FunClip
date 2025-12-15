import argparse
import os
import sys
import json
from llm.video_understanding import ShotDetector, VideoSemanticUnderstander

def main():
    parser = argparse.ArgumentParser(description='Video Semantic Understanding using Qwen-VL')
    parser.add_argument('--video', type=str, required=True, help='Path to the video file')
    parser.add_argument('--model', type=str, default="/remote-home/share/huggingface/Qwen3-VL-8B-Instruct", help='Model path or ID')
    parser.add_argument('--output', type=str, default="video_tags.json", help='Output JSON file')
    parser.add_argument('--threshold', type=float, default=0.7, help='Shot detection threshold')
    parser.add_argument('--device', type=str, default="cuda", help='Device to run on')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.video):
        print(f"Error: Video file {args.video} not found.")
        sys.exit(1)
        
    print(f"Processing video: {args.video}")
    
    # 1. Detect Shots
    print("Detecting shots...")
    detector = ShotDetector(threshold=args.threshold)
    shots = detector.detect(args.video)
    print(f"Detected {len(shots)} shots.")
    
    if not shots:
        print("No shots detected. Exiting.")
        sys.exit(0)
        
    # 2. Extract Tags
    print(f"Loading model {args.model}...")
    try:
        understander = VideoSemanticUnderstander(model_path=args.model, device=args.device)
    except Exception as e:
        print(f"Error loading model: {e}")
        sys.exit(1)
        
    print("Extracting semantic tags...")
    results = understander.understand(args.video, shots)
    
    # 3. Save Results
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
        
    print(f"Results saved to {args.output}")

if __name__ == "__main__":
    main()
