#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
# 视频风格模板管理器

import os
import json
import logging
from typing import Dict, List, Optional, Tuple, Any
from moviepy.editor import VideoFileClip, ColorClip, CompositeVideoClip
from moviepy.video.fx import all as vfx
import numpy as np
import cv2


class StyleTemplateManager:
    """
    视频风格模板管理器
    支持应用预设的视频风格模板，包括色彩分级、滤镜、转场、字幕样式等
    """
    
    def __init__(self, template_file: Optional[str] = None):
        """
        初始化风格模板管理器
        
        参数:
            template_file: 模板配置文件路径，默认使用内置模板
        """
        self.logger = logging.getLogger(__name__)
        
        if template_file is None:
            # 使用默认模板文件
            current_dir = os.path.dirname(os.path.abspath(__file__))
            template_file = os.path.join(current_dir, "style_templates.json")
        
        self.template_file = template_file
        self.templates = self._load_templates()
    
    def _load_templates(self) -> Dict:
        """
        加载模板配置文件
        
        返回:
            模板配置字典
        """
        try:
            if not os.path.exists(self.template_file):
                self.logger.warning(f"模板文件不存在: {self.template_file}")
                return {"templates": {}, "filter_definitions": {}}
            
            with open(self.template_file, 'r', encoding='utf-8') as f:
                templates = json.load(f)
            
            self.logger.info(f"成功加载 {len(templates.get('templates', {}))} 个风格模板")
            return templates
        
        except Exception as e:
            self.logger.error(f"加载模板文件失败: {e}")
            return {"templates": {}, "filter_definitions": {}}
    
    def get_available_templates(self) -> List[str]:
        """
        获取所有可用的模板名称
        
        返回:
            模板名称列表
        """
        return list(self.templates.get("templates", {}).keys())
    
    def get_template(self, template_name: str) -> Optional[Dict]:
        """
        获取指定模板的配置
        
        参数:
            template_name: 模板名称
        
        返回:
            模板配置字典，如果不存在则返回None
        """
        return self.templates.get("templates", {}).get(template_name)
    
    def get_template_description(self, template_name: str) -> str:
        """
        获取模板描述
        
        参数:
            template_name: 模板名称
        
        返回:
            模板描述文本
        """
        template = self.get_template(template_name)
        if template:
            return template.get("description", "无描述")
        return "模板不存在"
    
    def apply_style_to_video(
        self,
        video_path: str,
        output_path: str,
        template_name: str,
        apply_color_grading: bool = True,
        apply_filters: bool = True,
        apply_speed: bool = False,
        custom_subtitle_config: Optional[Dict] = None
    ) -> Tuple[bool, str, Dict]:
        """
        应用风格模板到视频
        
        参数:
            video_path: 输入视频路径
            output_path: 输出视频路径
            template_name: 模板名称
            apply_color_grading: 是否应用色彩分级
            apply_filters: 是否应用滤镜
            apply_speed: 是否应用速度调整
            custom_subtitle_config: 自定义字幕配置（将覆盖模板配置）
        
        返回:
            (成功标志, 消息, 应用的配置)
        """
        try:
            print(f"\n[风格管理器] 🎬 开始处理...")
            
            # 获取模板配置
            template = self.get_template(template_name)
            if not template:
                print(f"[风格管理器] ❌ 模板不存在: {template_name}")
                return False, f"❌ 模板不存在: {template_name}", {}
            
            if not os.path.exists(video_path):
                print(f"[风格管理器] ❌ 视频文件不存在: {video_path}")
                return False, f"❌ 视频文件不存在: {video_path}", {}
            
            print(f"[风格管理器] 📂 正在加载视频: {os.path.basename(video_path)}")
            self.logger.info(f"开始应用风格模板: {template_name} -> {video_path}")
            
            # 加载视频
            video = VideoFileClip(video_path)
            original_duration = video.duration
            print(f"[风格管理器] ✅ 视频加载完成 (时长: {original_duration:.1f}秒)")
            
            # 应用的配置记录
            applied_config = {
                "template_name": template_name,
                "effects": []
            }
            
            # 1. 应用色彩分级
            if apply_color_grading and "color_grading" in template:
                print(f"[风格管理器] 🎨 正在应用色彩分级...")
                video = self._apply_color_grading(video, template["color_grading"])
                applied_config["effects"].append("color_grading")
                print(f"[风格管理器] ✅ 色彩分级完成")
                self.logger.info("✓ 应用色彩分级")
            
            # 2. 应用滤镜
            if apply_filters and "filters" in template:
                filter_list = template['filters']
                print(f"[风格管理器] 🎭 正在应用 {len(filter_list)} 个滤镜: {', '.join(filter_list)}")
                video = self._apply_filters(video, filter_list)
                applied_config["effects"].append("filters")
                print(f"[风格管理器] ✅ 滤镜应用完成")
                self.logger.info(f"✓ 应用滤镜: {', '.join(filter_list)}")
            
            # 3. 应用速度调整
            if apply_speed and "speed" in template:
                speed_factor = template["speed"]
                if speed_factor != 1.0:
                    print(f"[风格管理器] ⚡ 正在调整速度: {speed_factor}x")
                    video = video.fx(vfx.speedx, speed_factor)
                    applied_config["effects"].append(f"speed_{speed_factor}x")
                    print(f"[风格管理器] ✅ 速度调整完成")
                    self.logger.info(f"✓ 调整速度: {speed_factor}x")
            
            # 4. 记录字幕配置（用于后续处理）
            subtitle_config = custom_subtitle_config or template.get("subtitle", {})
            applied_config["subtitle"] = subtitle_config
            
            # 5. 记录转场配置（用于后续处理）
            if "transition" in template:
                applied_config["transition"] = template["transition"]
            
            # 6. 记录音乐风格（用于后续处理）
            if "music_style" in template:
                applied_config["music_style"] = template["music_style"]
            
            # 确保输出目录存在
            output_dir = os.path.dirname(output_path)
            if output_dir:
                os.makedirs(output_dir, exist_ok=True)
            
            # 导出视频
            print(f"[风格管理器] 💾 正在导出视频...")
            print(f"[风格管理器]    编码器: H.264, 预设: medium, 线程: 4")
            self.logger.info(f"正在导出风格化视频...")
            
            video.write_videofile(
                output_path,
                codec="libx264",
                audio_codec="aac",
                fps=video.fps,
                preset="medium",
                threads=4,
                logger=None
            )
            
            video.close()
            print(f"[风格管理器] ✅ 视频导出完成")
            
            # 检查文件大小
            file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
            print(f"[风格管理器] 📊 文件大小: {file_size_mb:.2f} MB")
            
            success_msg = f"✅ 风格应用成功!\n"
            success_msg += f"🎨 模板: {template_name}\n"
            success_msg += f"📁 输出: {output_path}\n"
            success_msg += f"⏱️ 时长: {original_duration:.1f}s → {video.duration:.1f}s\n"
            success_msg += f"💾 大小: {file_size_mb:.2f} MB\n"
            success_msg += f"✨ 效果: {', '.join(applied_config['effects'])}"
            
            print(f"[风格管理器] 🎉 处理完成!\n")
            self.logger.info(success_msg)
            return True, success_msg, applied_config
            
        except Exception as e:
            error_msg = f"❌ 应用风格失败: {str(e)}"
            print(f"[风格管理器] ❌ 错误: {str(e)}")
            self.logger.error(error_msg, exc_info=True)
            import traceback
            traceback.print_exc()
            return False, error_msg, {}
    
    def _apply_color_grading(self, video: VideoFileClip, color_config: Dict) -> VideoFileClip:
        """
        应用色彩分级
        
        参数:
            video: 视频片段
            color_config: 色彩配置
        
        返回:
            处理后的视频片段
        """
        try:
            # 提取参数
            brightness = color_config.get("brightness", 1.0)
            contrast = color_config.get("contrast", 1.0)
            saturation = color_config.get("saturation", 1.0)
            gamma = color_config.get("gamma", 1.0)
            
            print(f"[色彩分级] 参数: 亮度={brightness}, 对比度={contrast}, 饱和度={saturation}, Gamma={gamma}")
            
            # 应用亮度调整
            if brightness != 1.0:
                print(f"[色彩分级] ⚡ 应用亮度调整: {brightness}x")
                video = video.fx(vfx.colorx, brightness)
            
            # 应用对比度调整（通过lum_contrast）
            if contrast != 1.0:
                contrast_offset = (contrast - 1.0) * 0.5
                print(f"[色彩分级] 📊 应用对比度调整: {contrast}x (offset={contrast_offset:.2f})")
                video = video.fx(vfx.lum_contrast, lum=0, contrast=contrast_offset)
            
            # 应用gamma调整
            if gamma != 1.0:
                print(f"[色彩分级] 🌟 应用Gamma校正: {gamma}")
                video = video.fx(vfx.gamma_corr, gamma)
            
            # 实现饱和度调整（通过HSV色彩空间）
            if saturation != 1.0:
                print(f"[色彩分级] 🎨 应用饱和度调整: {saturation}x")
                
                def adjust_saturation(get_frame, t):
                    import cv2
                    frame = get_frame(t)
                    
                    # RGB to HSV
                    hsv = cv2.cvtColor(frame.astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
                    
                    # 调整饱和度通道 (H, S, V)
                    hsv[:, :, 1] = np.clip(hsv[:, :, 1] * saturation, 0, 255)
                    
                    # HSV to RGB
                    rgb = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB)
                    
                    return rgb
                
                video = video.fl(adjust_saturation)
            
            print(f"[色彩分级] ✅ 色彩分级完成")
            return video
            
        except Exception as e:
            self.logger.warning(f"色彩分级应用失败: {e}")
            return video
    
    def _apply_filters(self, video: VideoFileClip, filters: List[str]) -> VideoFileClip:
        """
        应用滤镜列表
        
        参数:
            video: 视频片段
            filters: 滤镜名称列表
        
        返回:
            处理后的视频片段
        """
        filter_defs = self.templates.get("filter_definitions", {})
        
        for i, filter_name in enumerate(filters, 1):
            if filter_name not in filter_defs:
                print(f"[滤镜] ⚠️  未定义的滤镜: {filter_name}")
                self.logger.warning(f"未定义的滤镜: {filter_name}")
                continue
            
            print(f"[滤镜] [{i}/{len(filters)}] 正在应用: {filter_name}")
            try:
                video = self._apply_single_filter(video, filter_name, filter_defs[filter_name])
                print(f"[滤镜] ✅ {filter_name} 应用完成")
            except Exception as e:
                print(f"[滤镜] ⚠️  {filter_name} 应用失败: {e}")
                self.logger.warning(f"滤镜 {filter_name} 应用失败: {e}")
        
        return video
    
    def _apply_single_filter(
        self, 
        video: VideoFileClip, 
        filter_name: str, 
        filter_config: Dict
    ) -> VideoFileClip:
        """
        应用单个滤镜
        
        参数:
            video: 视频片段
            filter_name: 滤镜名称
            filter_config: 滤镜配置
        
        返回:
            处理后的视频片段
        """
        filter_type = filter_config.get("type")
        print(f"[滤镜] 🎭 应用滤镜 '{filter_name}' (类型: {filter_type})")
        
        if filter_type == "colorx":
            factor = filter_config.get("factor", 1.0)
            return video.fx(vfx.colorx, factor)
        
        elif filter_type == "lum_contrast":
            lum = filter_config.get("lum", 0)
            contrast = filter_config.get("contrast", 0)
            return video.fx(vfx.lum_contrast, lum=lum, contrast=contrast)
        
        elif filter_type == "gamma_corr":
            gamma = filter_config.get("gamma", 1.0)
            return video.fx(vfx.gamma_corr, gamma)
        
        elif filter_type == "blur":
            # moviepy的blur效果
            kernel_size = filter_config.get("kernel_size", 3)
            # 注意：需要额外处理
            return video
        
        elif filter_type == "mask_vignette":
            # 暗角效果
            size = filter_config.get("size", 0.8)
            print(f"[滤镜] 🌑 暗角效果强度: {1-size:.2f}")
            
            def vignette_effect(get_frame, t):
                frame = get_frame(t)
                h, w = frame.shape[:2]
                
                # 创建径向渐变蒙版
                Y, X = np.ogrid[:h, :w]
                center_y, center_x = h / 2, w / 2
                
                # 计算每个像素到中心的距离
                dist_from_center = np.sqrt((X - center_x)**2 + (Y - center_y)**2)
                max_dist = np.sqrt(center_x**2 + center_y**2)
                
                # 创建渐变蒙版 - 增强效果
                mask = 1 - ((dist_from_center / max_dist) ** 1.5) * (1 - size)
                mask = np.clip(mask, 0, 1)
                
                # 应用蒙版
                if len(frame.shape) == 3:
                    mask = mask[:, :, np.newaxis]
                
                return (frame * mask).astype(np.uint8)
            
            return video.fl(vignette_effect)
        
        else:
            self.logger.warning(f"不支持的滤镜类型: {filter_type}")
            return video
    
    def get_subtitle_config(self, template_name: str) -> Dict:
        """
        获取模板的字幕配置
        
        参数:
            template_name: 模板名称
        
        返回:
            字幕配置字典
        """
        template = self.get_template(template_name)
        if template and "subtitle" in template:
            return template["subtitle"]
        return {}
    
    def get_music_style(self, template_name: str) -> Optional[str]:
        """
        获取模板的音乐风格
        
        参数:
            template_name: 模板名称
        
        返回:
            音乐风格名称
        """
        template = self.get_template(template_name)
        if template:
            return template.get("music_style")
        return None
    
    def preview_template_info(self, template_name: str) -> str:
        """
        预览模板详细信息
        
        参数:
            template_name: 模板名称
        
        返回:
            格式化的模板信息文本
        """
        template = self.get_template(template_name)
        if not template:
            return f"❌ 模板不存在: {template_name}"
        
        info = f"🎨 **{template_name}**\n\n"
        info += f"📝 {template.get('description', '无描述')}\n\n"
        
        # 色彩分级信息
        if "color_grading" in template:
            cg = template["color_grading"]
            info += "**色彩分级:**\n"
            info += f"  • 亮度: {cg.get('brightness', 1.0)}\n"
            info += f"  • 对比度: {cg.get('contrast', 1.0)}\n"
            info += f"  • 饱和度: {cg.get('saturation', 1.0)}\n"
            info += f"  • Gamma: {cg.get('gamma', 1.0)}\n\n"
        
        # 滤镜信息
        if "filters" in template:
            info += f"**滤镜:** {', '.join(template['filters'])}\n\n"
        
        # 字幕样式
        if "subtitle" in template:
            sub = template["subtitle"]
            info += "**字幕样式:**\n"
            info += f"  • 字号: {sub.get('font_size', 32)}px\n"
            info += f"  • 颜色: {sub.get('font_color', 'white')}\n"
            info += f"  • 描边: {sub.get('stroke_width', 2)}px {sub.get('stroke_color', 'black')}\n\n"
        
        # 转场效果
        if "transition" in template:
            trans = template["transition"]
            info += f"**转场:** {trans.get('type', 'none')} ({trans.get('duration', 0.5)}s)\n\n"
        
        # 速度调整
        if "speed" in template:
            info += f"**速度:** {template['speed']}x\n\n"
        
        # 音乐风格
        if "music_style" in template:
            info += f"**配乐风格:** {template['music_style']}\n"
        
        return info
