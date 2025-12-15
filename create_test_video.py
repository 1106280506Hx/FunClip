from moviepy.editor import ColorClip, concatenate_videoclips
import os

def create_test_video(filename="test_video.mp4"):
    # Create 3 clips of different colors, 2 seconds each
    clip1 = ColorClip(size=(640, 480), color=(255, 0, 0), duration=2)
    clip2 = ColorClip(size=(640, 480), color=(0, 255, 0), duration=2)
    clip3 = ColorClip(size=(640, 480), color=(0, 0, 255), duration=2)
    
    final_clip = concatenate_videoclips([clip1, clip2, clip3])
    final_clip.write_videofile(filename, fps=24)
    print(f"Created {filename}")

if __name__ == "__main__":
    create_test_video("/remote-home/haoningwu/xiaohuang/FunClip/test_video.mp4")
