from moviepy.editor import CompositeVideoClip, TextClip, ColorClip
import math

class TransFX:
    """
    定义“进场”特效 (Entry Effects)。
    这些特效只应用于当前镜头(Incoming Clip)，通过合成覆盖在上一个镜头之上。
    """

    @staticmethod
    def slide_in(clip, duration, direction='left'):
        """
        推镜转场 (Slide/Push)
        镜头从屏幕外滑入，覆盖前一个镜头。
        """
        w, h = clip.size
        
        def pos(t):
            # t 从 0 到 duration
            if t >= duration:
                return (0, 0)
            
            progress = t / duration
            # 使用 ease-out 曲线让运动更自然 (1 - (1-x)^3)
            ease = 1 - pow(1 - progress, 3) 
            
            if direction == 'left': # 从右往左进
                return (int(w * (1 - ease)), 0)
            elif direction == 'right': # 从左往右进
                return (int(-w * (1 - ease)), 0)
            elif direction == 'up': # 从下往上进
                return (0, int(h * (1 - ease)))
            elif direction == 'down': # 从上往下进
                return (0, int(-h * (1 - ease)))
            return (0,0)

        # 必须设置 composite 才能应用 position
        return clip.set_position(pos)

    @staticmethod
    def zoom_in(clip, duration):
        """
        缩放进场 (Zoom In / Scale Up)
        镜头从小变大，伴随透明度变化。
        """
        def resize_func(t):
            if t >= duration:
                return 1.0
            # 0.5 -> 1.0
            progress = t / duration
            ease = 1 - pow(1 - progress, 3)
            return 0.5 + 0.5 * ease

        # 同时应用 resize 和 fadein
        # 注意：MoviePy 的 resize 比较耗时
        return clip.resize(resize_func).fadein(duration)

    @staticmethod
    def wipe_in(clip, duration, direction='left'):
        """
        划像转场 (Wipe) - 简化版使用 Slide 模拟，或者结合 Mask
        为了性能，这里使用带边缘模糊的 Slide 模拟 Wipe
        """
        # 真正的 Wipe 需要动 Mask，这里用 Slide + Crossfade 模拟类似效果
        return TransFX.slide_in(clip, duration, direction).crossfadein(duration / 2)

    @staticmethod
    def glitch(clip, duration):
        """
        故障风 (Glitch) - 简单的闪烁色差模拟
        """
        # 简单模拟：快速闪白 + 随机位置抖动
        import random
        def pos(t):
            if t > duration: return (0,0)
            if random.random() > 0.5:
                return (random.randint(-10, 10), random.randint(-10, 10))
            return (0,0)
        
        return clip.set_position(pos).fadein(0.1)