#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# 视频导出管理器 - 支持多分辨率、多平台格式适配

import os
import logging
from moviepy.editor import VideoFileClip
from typing import Dict, List, Tuple, Optional

class ExportManager:
    """
    视频导出管理器
    支持多分辨率、多平台格式的视频导出
    """
    
    # 预设分辨率配置
    RESOLUTION_PRESETS = {
        "4K": (3840, 2160),
        "2K": (2560, 1440),
        "1080p": (1920, 1080),
        "720p": (1280, 720),
        "480p": (854, 480),
        "360p": (640, 360),
    }
    
    # 平台预设配置
    PLATFORM_PRESETS = {
        "通用/Universal": {
            "codec": "libx264",
            "audio_codec": "aac",
            "bitrate": "5000k",
            "fps": 30,
            "preset": "medium"
        },
        "抖音/Douyin": {
            "codec": "libx264",
            "audio_codec": "aac",
            "bitrate": "4000k",
            "fps": 30,
            "preset": "medium",
            "aspect_ratio": (9, 16)  # 竖屏
        },
        "B站/Bilibili": {
            "codec": "libx264",
            "audio_codec": "aac",
            "bitrate": "6000k",
            "fps": 30,
            "preset": "medium"
        },
        "YouTube": {
            "codec": "libx264",
            "audio_codec": "aac",
            "bitrate": "8000k",
            "fps": 30,
            "preset": "medium"
        },
        "微信/WeChat": {
            "codec": "libx264",
            "audio_codec": "aac",
            "bitrate": "2000k",
            "fps": 25,
            "preset": "fast",
            "max_size_mb": 25  # 微信视频限制25MB
        },
        "高质量/High Quality": {
            "codec": "libx264",
            "audio_codec": "aac",
            "bitrate": "12000k",
            "fps": 60,
            "preset": "slow"
        }
    }
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def export_video(
        self,
        video_path: str,
        output_path: str,
        resolution: str = "原始/Original",
        platform: str = "通用/Universal",
        custom_width: Optional[int] = None,
        custom_height: Optional[int] = None,
        custom_bitrate: Optional[str] = None,
        custom_fps: Optional[int] = None
    ) -> Tuple[bool, str]:
        """
        导出视频
        
        参数:
            video_path: 输入视频路径
            output_path: 输出视频路径
            resolution: 分辨率预设 (如 "1080p", "720p" 或 "原始/Original")
            platform: 平台预设 (如 "抖音/Douyin", "B站/Bilibili")
            custom_width: 自定义宽度
            custom_height: 自定义高度
            custom_bitrate: 自定义比特率
            custom_fps: 自定义帧率
        
        返回:
            (成功标志, 消息)
        """
        try:
            print(f"\n[导出引擎] ⚙️ 开始视频导出处理")
            
            if not os.path.exists(video_path):
                print(f"[导出引擎] ❌ 文件不存在: {video_path}")
                return False, f"❌ 视频文件不存在: {video_path}"
            
            print(f"[导出引擎] 📁 输入文件: {video_path}")
            self.logger.info(f"开始导出视频: {video_path}")
            
            # 规范化输出路径：如果给的是目录或没有扩展名，自动补全文件名
            output_path = output_path.strip()
            if not output_path:
                base_name = os.path.splitext(os.path.basename(video_path))[0]
                output_path = os.path.join(os.path.dirname(video_path), f"{base_name}_export.mp4")
                print(f"[导出引擎] 📝 自动生成输出路径: {output_path}")
            if os.path.isdir(output_path):
                base_name = os.path.splitext(os.path.basename(video_path))[0]
                output_path = os.path.join(output_path, f"{base_name}_export.mp4")
                print(f"[导出引擎] 📁 补全目录路径: {output_path}")
            root, ext = os.path.splitext(output_path)
            if not ext:
                output_path = f"{output_path}.mp4"
                print(f"[导出引擎] 📝 添加扩展名: {output_path}")

            print(f"[导出引擎] 💾 输出文件: {output_path}")
            
            # 加载视频
            print(f"[导出引擎] 🔧 加载视频...")
            video = VideoFileClip(video_path)
            original_width, original_height = video.size
            print(f"[导出引擎] 📏 原始分辨率: {original_width}x{original_height}")
            
            # 获取平台配置
            platform_config = self.PLATFORM_PRESETS.get(
                platform, 
                self.PLATFORM_PRESETS["通用/Universal"]
            )
            print(f"[导出引擎] 🎯 平台配置: {platform}")
            
            # 确定输出分辨率
            if custom_width and custom_height:
                target_width, target_height = custom_width, custom_height
                print(f"[导出引擎] ⚙️ 使用自定义分辨率: {target_width}x{target_height}")
            elif resolution != "原始/Original" and resolution in self.RESOLUTION_PRESETS:
                target_width, target_height = self.RESOLUTION_PRESETS[resolution]
                # 如果原始分辨率小于目标分辨率，则保持原始分辨率
                if original_width < target_width or original_height < target_height:
                    target_width, target_height = original_width, original_height
                    print(f"[导出引擎] ℹ️ 原始分辨率小于目标，保持原始: {target_width}x{target_height}")
                    self.logger.warning(f"原始分辨率({original_width}x{original_height})小于目标分辨率，保持原始分辨率")
                else:
                    print(f"[导出引擎] 📐 使用预设分辨率: {target_width}x{target_height}")
            else:
                target_width, target_height = original_width, original_height
                print(f"[导出引擎] 📐 保持原始分辨率: {target_width}x{target_height}")
            
            # 调整分辨率
            if (target_width, target_height) != (original_width, original_height):
                print(f"[导出引擎] 🔄 调整分辨率: {original_width}x{original_height} → {target_width}x{target_height}")
                video = video.resize((target_width, target_height))
                self.logger.info(f"调整分辨率: {original_width}x{original_height} -> {target_width}x{target_height}")
            
            # 确定输出参数
            codec = platform_config.get("codec", "libx264")
            audio_codec = platform_config.get("audio_codec", "aac")
            bitrate = custom_bitrate if custom_bitrate else platform_config.get("bitrate", "5000k")
            fps = custom_fps if custom_fps else platform_config.get("fps", 30)
            preset = platform_config.get("preset", "medium")
            
            print(f"[导出引擎] ⚙️ 编码参数:")
            print(f"[导出引擎]    视频编码器: {codec}")
            print(f"[导出引擎]    音频编码器: {audio_codec}")
            print(f"[导出引擎]    比特率: {bitrate}")
            print(f"[导出引擎]    帧率: {fps} fps")
            print(f"[导出引擎]    预设: {preset}")
            
            # 确保输出目录存在
            output_dir = os.path.dirname(output_path)
            if output_dir:
                os.makedirs(output_dir, exist_ok=True)
                print(f"[导出引擎] 📂 确保输出目录存在: {output_dir}")
            
            # 导出视频
            print(f"[导出引擎] ⏳ 开始编码导出...")
            self.logger.info(f"导出参数: 分辨率={target_width}x{target_height}, 比特率={bitrate}, fps={fps}, 预设={preset}")
            
            video.write_videofile(
                output_path,
                codec=codec,
                audio_codec=audio_codec,
                bitrate=bitrate,
                fps=fps,
                preset=preset,
                threads=4,
                logger=None  # 禁用moviepy的进度条，避免干扰
            )
            
            video.close()
            
            # 检查文件大小
            file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
            max_size_mb = platform_config.get("max_size_mb")
            
            print(f"[导出引擎] 💾 文件大小: {file_size_mb:.2f} MB")
            
            size_warning = ""
            if max_size_mb and file_size_mb > max_size_mb:
                size_warning = f"\n⚠️ 警告: 文件大小({file_size_mb:.1f}MB)超过{platform}推荐的{max_size_mb}MB限制"
                print(f"[导出引擎] ⚠️ 文件大小超出限制: {file_size_mb:.1f}MB > {max_size_mb}MB")
            
            success_msg = f"✅ 视频导出成功!\n"
            success_msg += f"📁 路径: {output_path}\n"
            success_msg += f"📐 分辨率: {target_width}x{target_height}\n"
            success_msg += f"📊 比特率: {bitrate}\n"
            success_msg += f"🎬 帧率: {fps} fps\n"
            success_msg += f"💾 文件大小: {file_size_mb:.2f} MB"
            success_msg += size_warning
            
            print(f"[导出引擎] ✅ 导出成功! {target_width}x{target_height}, {file_size_mb:.2f}MB")
            self.logger.info(success_msg)
            return True, success_msg
            
        except Exception as e:
            error_msg = f"❌ 导出失败: {str(e)}"
            print(f"[导出引擎] ❌ 导出失败: {e}")
            self.logger.error(error_msg, exc_info=True)
            return False, error_msg
    
    def batch_export(
        self,
        video_path: str,
        output_dir: str,
        resolutions: List[str],
        platforms: List[str]
    ) -> Dict[str, Tuple[bool, str]]:
        """
        批量导出多个版本
        
        参数:
            video_path: 输入视频路径
            output_dir: 输出目录
            resolutions: 分辨率列表
            platforms: 平台列表
        
        返回:
            导出结果字典 {文件名: (成功标志, 消息)}
        """
        print(f"\n[批量导出引擎] 📦 开始批量导出")
        print(f"[批量导出引擎] 📁 输入视频: {video_path}")
        print(f"[批量导出引擎] 💾 输出目录: {output_dir}")
        print(f"[批量导出引擎] 📐 分辨率: {resolutions}")
        print(f"[批量导出引擎] 🎯 平台: {platforms}")
        
        results = {}
        base_name = os.path.splitext(os.path.basename(video_path))[0]
        
        total_tasks = len(platforms) * len(resolutions)
        current_task = 0
        
        print(f"[批量导出引擎] 📊 总任务数: {total_tasks}")
        
        for platform in platforms:
            for resolution in resolutions:
                current_task += 1
                # 生成输出文件名
                platform_suffix = platform.split('/')[0]  # 取中文部分
                res_suffix = resolution.split('/')[0] if '/' in resolution else resolution
                output_filename = f"{base_name}_{platform_suffix}_{res_suffix}.mp4"
                output_path = os.path.join(output_dir, output_filename)
                
                print(f"\n[批量导出引擎] ⏳ [{current_task}/{total_tasks}] 正在导出: {output_filename}")
                print(f"[批量导出引擎]    平台: {platform}, 分辨率: {resolution}")
                
                # 导出
                success, msg = self.export_video(
                    video_path, 
                    output_path, 
                    resolution=resolution, 
                    platform=platform
                )
                results[output_filename] = (success, msg)
                
                if success:
                    print(f"[批量导出引擎] ✅ [{current_task}/{total_tasks}] 成功: {output_filename}")
                else:
                    print(f"[批量导出引擎] ❌ [{current_task}/{total_tasks}] 失败: {output_filename}")
        
        success_count = sum(1 for success, _ in results.values() if success)
        print(f"\n[批量导出引擎] 🎉 批量导出完成! 成功: {success_count}/{total_tasks}")
        
        return results
    
    @staticmethod
    def get_available_resolutions() -> List[str]:
        """获取可用的分辨率列表"""
        return ["原始/Original"] + list(ExportManager.RESOLUTION_PRESETS.keys())
    
    @staticmethod
    def get_available_platforms() -> List[str]:
        """获取可用的平台列表"""
        return list(ExportManager.PLATFORM_PRESETS.keys())


class VideoPreviewManager:
    """
    视频预览管理器
    提供快速预览和参数调节
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def get_video_info(self, video_path: str) -> Dict[str, any]:
        """
        获取视频信息
        
        参数:
            video_path: 视频文件路径
        
        返回:
            视频信息字典
        """
        try:
            if not os.path.exists(video_path):
                print(f"[视频信息] ❌ 文件不存在: {video_path}")
                return {"error": "视频文件不存在"}
            
            print(f"[视频信息] 📊 读取视频信息: {video_path}")
            video = VideoFileClip(video_path)
            
            info = {
                "width": video.size[0],
                "height": video.size[1],
                "duration": video.duration,
                "fps": video.fps,
                "has_audio": video.audio is not None,
                "file_size_mb": os.path.getsize(video_path) / (1024 * 1024)
            }
            
            print(f"[视频信息] ✅ 分辨率: {info['width']}x{info['height']}, 时长: {info['duration']:.1f}s, 大小: {info['file_size_mb']:.2f}MB")
            
            video.close()
            return info
            
        except Exception as e:
            print(f"[视频信息] ❌ 读取失败: {e}")
            self.logger.error(f"获取视频信息失败: {e}")
            return {"error": str(e)}
    
    def format_video_info(self, info: Dict[str, any]) -> str:
        """格式化视频信息为可读文本"""
        if "error" in info:
            return f"❌ {info['error']}"
        
        text = "📹 **视频信息**\n"
        text += f"📐 分辨率: {info['width']}x{info['height']}\n"
        text += f"⏱️ 时长: {info['duration']:.2f}秒\n"
        text += f"🎬 帧率: {info['fps']:.2f} fps\n"
        text += f"🔊 音频: {'有' if info['has_audio'] else '无'}\n"
        text += f"💾 文件大小: {info['file_size_mb']:.2f} MB"
        
        return text
