import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Film,
  Clapperboard,
  Sparkles,
  Zap,
  Cpu,
  Layers,
  X
} from 'lucide-react'
import { cn, formatDuration } from '../../utils/helpers'
import { useTimelineStore, useMediaStore, useAIDirectorStore } from '../../store'
import type { TimelineClip } from '../../types'

export function VideoPreview() {
  const { currentTime, duration, isPlaying, setIsPlaying, setCurrentTime, tracks } = useTimelineStore()
  const { generatedVideoUrl, isProcessing, setGeneratedVideoUrl } = useAIDirectorStore()
  const videos = useMediaStore((state) => state.videos)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const resultVideoRef = useRef<HTMLVideoElement>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(80)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [buffered, setBuffered] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [resultDuration, setResultDuration] = useState(0)
  const [resultCurrentTime, setResultCurrentTime] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastClipIdRef = useRef<string | null>(null)
  const lastAudioClipIdRef = useRef<string | null>(null)
  const isSeeking = useRef(false)
  const isTransitioning = useRef(false)

  // 当生成结果变化时，自动切换到结果预览
  useEffect(() => {
    if (generatedVideoUrl) {
      setShowResult(true)
    }
  }, [generatedVideoUrl])

  // 获取视频轨道上的所有片段，按开始时间排序
  const videoClips = useMemo(() => {
    const videoTrack = tracks.find(t => t.type === 'video')
    const clips = videoTrack?.clips || []
    return [...clips].sort((a, b) => a.startTime - b.startTime)
  }, [tracks])

  // 获取音频轨道上的所有片段
  const audioClips = useMemo(() => {
    const audioTrack = tracks.find(t => t.type === 'audio')
    const clips = audioTrack?.clips || []
    return [...clips].sort((a, b) => a.startTime - b.startTime)
  }, [tracks])

  // 根据时间找到应该播放的片段
  const findClipAtTime = useCallback((time: number, clips: TimelineClip[]): TimelineClip | undefined => {
    const clip = clips.find(clip =>
      time >= clip.startTime && time < clip.endTime
    )
    if (clip) return clip

    // 如果正好在最后一个片段的结束点，也返回该片段，这样能看到最后一帧
    if (clips.length > 0) {
      const lastClip = clips[clips.length - 1]
      if (Math.abs(time - lastClip.endTime) < 0.1) {
        return lastClip
      }
    }
    return undefined
  }, [])

  // 找到下一个片段
  const findNextClip = useCallback((afterTime: number, clips: TimelineClip[]): TimelineClip | undefined => {
    return clips.find(clip => clip.startTime >= afterTime)
  }, [])

  // 根据当前时间找到应该播放的片段
  const currentClip = useMemo(() => findClipAtTime(currentTime, videoClips), [findClipAtTime, currentTime, videoClips])
  const currentAudioClip = useMemo(() => findClipAtTime(currentTime, audioClips), [findClipAtTime, currentTime, audioClips])

  // 根据片段找到对应的视频源
  const currentVideo = useMemo(() => {
    if (!currentClip) return null
    const video = videos.find(v => v.id === currentClip.sourceId)
    return video || null
  }, [currentClip, videos])

  // 计算在源文件中的实际播放时间
  const getSourceTime = useCallback((timelineTime: number, clip: TimelineClip) => {
    const offsetInClip = timelineTime - clip.startTime
    return clip.sourceStart + offsetInClip
  }, [])

  // 切换到指定片段
  const switchToClip = useCallback((clip: TimelineClip, startTime: number) => {
    if (!videoRef.current) return

    const video = videos.find(v => v.id === clip.sourceId)
    if (!video) return

    isTransitioning.current = true
    lastClipIdRef.current = clip.id

    // 更新时间轴时间
    setCurrentTime(startTime)

    // 设置新的视频源
    const currentSrc = videoRef.current.src
    const needNewSource = !currentSrc.endsWith(video.path) && currentSrc !== video.path

    if (needNewSource) {
      videoRef.current.src = video.path
    }

    // 设置播放位置
    const sourceTime = getSourceTime(startTime, clip)
    videoRef.current.currentTime = sourceTime

    // 继续播放
    if (isPlaying) {
      videoRef.current.play().catch(console.error)
    }

    setTimeout(() => {
      isTransitioning.current = false
    }, 50)
  }, [videos, isPlaying, setCurrentTime, getSourceTime])

  // 视频时间更新时，同步到时间轴
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current || isSeeking.current || isTransitioning.current || showResult) return

    const clip = findClipAtTime(currentTime, videoClips)
    if (!clip) return

    // 根据视频当前时间计算时间轴时间
    const videoTime = videoRef.current.currentTime
    const timelineTime = clip.startTime + (videoTime - clip.sourceStart)

    // 检查是否超出当前片段范围
    if (timelineTime >= clip.endTime - 0.05) { // 提前一点检测，避免漏过
      // 查找下一个片段
      const nextClip = findNextClip(clip.endTime, videoClips)
      if (nextClip) {
        // 切换到下一个片段
        switchToClip(nextClip, nextClip.startTime)
      } else {
        // 没有下一个片段，停止播放
        setCurrentTime(clip.endTime)
        setIsPlaying(false)
      }
    } else {
      setCurrentTime(timelineTime)
    }
  }, [currentTime, videoClips, findClipAtTime, findNextClip, switchToClip, setCurrentTime, setIsPlaying])

  // 初始加载和片段切换时设置视频
  useEffect(() => {
    if (!videoRef.current || showResult) {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause()
      }
      return
    }

    if (!currentClip || !currentVideo || isTransitioning.current || isSeeking.current) return

    const clipChanged = lastClipIdRef.current !== currentClip.id

    if (clipChanged) {
      lastClipIdRef.current = currentClip.id

      // 设置视频源
      const currentSrc = videoRef.current.src
      if (!currentSrc.endsWith(currentVideo.path) && currentSrc !== currentVideo.path) {
        videoRef.current.src = currentVideo.path
      }
    }

    // 始终确保播放位置同步（如果偏差较大）
    const targetSourceTime = getSourceTime(currentTime, currentClip)
    if (Math.abs(videoRef.current.currentTime - targetSourceTime) > 0.2) {
      videoRef.current.currentTime = targetSourceTime
    }

    if (isPlaying && videoRef.current.paused) {
      videoRef.current.play().catch(console.error)
    } else if (!isPlaying && !videoRef.current.paused) {
      videoRef.current.pause()
    }
  }, [currentClip?.id, currentVideo?.path, currentTime, isPlaying, getSourceTime, showResult])

  // 同步 AI 生成结果视频的播放状态
  useEffect(() => {
    if (!resultVideoRef.current) return

    if (!showResult) {
      if (!resultVideoRef.current.paused) {
        resultVideoRef.current.pause()
      }
      return
    }

    if (isPlaying && resultVideoRef.current.paused) {
      resultVideoRef.current.play().catch(console.error)
    } else if (!isPlaying && !resultVideoRef.current.paused) {
      resultVideoRef.current.pause()
    }
  }, [isPlaying, showResult])

  // 音频同步逻辑
  useEffect(() => {
    if (!audioRef.current) return

    if (showResult) {
      audioRef.current.pause()
      return
    }

    if (!currentAudioClip) {
      audioRef.current.pause()
      audioRef.current.src = ''
      lastAudioClipIdRef.current = null
      return
    }

    const clipChanged = lastAudioClipIdRef.current !== currentAudioClip.id
    if (clipChanged) {
      lastAudioClipIdRef.current = currentAudioClip.id
      // 音频 sourceId 存储的是路径
      audioRef.current.src = currentAudioClip.sourceId
      audioRef.current.load()
    }

    const targetSourceTime = getSourceTime(currentTime, currentAudioClip)
    if (Math.abs(audioRef.current.currentTime - targetSourceTime) > 0.2) {
      audioRef.current.currentTime = targetSourceTime
    }

    if (isPlaying) {
      audioRef.current.play().catch(console.error)
    } else {
      audioRef.current.pause()
    }
  }, [currentAudioClip, currentTime, isPlaying, getSourceTime, showResult])

  // 同步音量
  useEffect(() => {
    const v = isMuted ? 0 : volume / 100
    if (videoRef.current) {
      videoRef.current.volume = v
    }
    if (audioRef.current) {
      audioRef.current.volume = v
    }
    if (resultVideoRef.current) {
      resultVideoRef.current.volume = v
    }
  }, [volume, isMuted, showResult, generatedVideoUrl])

  // 缓冲进度更新
  const handleProgress = () => {
    if (videoRef.current && videoRef.current.buffered.length > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1)
      const videoDuration = videoRef.current.duration
      if (videoDuration > 0) {
        setBuffered((bufferedEnd / videoDuration) * 100)
      }
    }
  }

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleSkipBack = () => {
    const newTime = Math.max(0, displayCurrentTime - 5)
    if (showResult) {
      setResultCurrentTime(newTime)
      if (resultVideoRef.current) resultVideoRef.current.currentTime = newTime
    } else {
      setCurrentTime(newTime)
    }
  }

  const handleSkipForward = () => {
    const newTime = Math.min(displayDuration, displayCurrentTime + 5)
    if (showResult) {
      setResultCurrentTime(newTime)
      if (resultVideoRef.current) resultVideoRef.current.currentTime = newTime
    } else {
      setCurrentTime(newTime)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    const newTime = percentage * displayDuration

    // 标记正在 seek，防止 timeUpdate 干扰
    isSeeking.current = true

    if (showResult) {
      setResultCurrentTime(newTime)
      if (resultVideoRef.current) {
        resultVideoRef.current.currentTime = newTime
      }
    } else {
      setCurrentTime(newTime)

      // 同步视频位置
      if (videoRef.current) {
        // 找到新时间点对应的片段
        const targetClip = videoClips.find(clip =>
          newTime >= clip.startTime && newTime < clip.endTime
        )
        if (targetClip) {
          const targetVideo = videos.find(v => v.id === targetClip.sourceId)
          if (targetVideo) {
            const sourceTime = targetClip.sourceStart + (newTime - targetClip.startTime)
            // 如果需要切换视频源
            if (!videoRef.current.src.endsWith(targetVideo.path)) {
              videoRef.current.src = targetVideo.path
            }
            videoRef.current.currentTime = sourceTime
          }
        }
      }
    }

    // 延迟解除 seeking 状态
    setTimeout(() => {
      isSeeking.current = false
    }, 100)
  }

  const handleFullscreen = () => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value)
    setVolume(newVolume)
    if (newVolume > 0) setIsMuted(false)
  }

  // 当前显示的进度条总时长
  const displayDuration = useMemo(() => {
    if (showResult) {
      return resultDuration || 0
    }
    return duration || 0
  }, [showResult, resultDuration, duration])

  // 当前显示的播放时间
  const displayCurrentTime = showResult ? resultCurrentTime : currentTime

  // 判断时间轴是否有内容
  const hasContent = videoClips.length > 0

  return (
    <div className="h-full flex flex-col bg-dark-900 p-4">
      {/* 成片预览标题 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clapperboard className="w-4 h-4 text-accent-primary" />
            <span className="text-sm font-medium text-white">成片预览</span>
          </div>
          
          {generatedVideoUrl && (
            <div className="flex bg-dark-800 rounded-lg p-0.5 border border-dark-700">
              <button
                onClick={() => {
                  setShowResult(false)
                  // 切换回时间轴时，确保视频位置同步
                  if (videoRef.current && !isSeeking.current) {
                    // 逻辑已在 useEffect 中处理
                  }
                }}
                className={cn(
                  "px-3 py-1 text-[10px] font-medium rounded transition-all",
                  !showResult ? "bg-dark-600 text-white shadow-sm" : "text-dark-400 hover:text-dark-200"
                )}
              >
                时间轴预览
              </button>
              <button
                onClick={() => {
                  setShowResult(true)
                  // 切换到结果时，同步时间
                  if (resultVideoRef.current) {
                    resultVideoRef.current.currentTime = currentTime
                  }
                }}
                className={cn(
                  "px-3 py-1 text-[10px] font-medium rounded transition-all flex items-center gap-1",
                  showResult ? "bg-accent-primary text-white shadow-sm" : "text-dark-400 hover:text-dark-200"
                )}
              >
                AI 生成结果
                {showResult && (
                  <div 
                    onClick={(e) => {
                      e.stopPropagation()
                      setGeneratedVideoUrl(null)
                      setShowResult(false)
                    }}
                    className="p-0.5 rounded-full hover:bg-white/20 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </div>
                )}
              </button>
            </div>
          )}
        </div>
        {currentClip && currentVideo && !showResult && (
          <span className="text-xs text-dark-400">
            当前片段: {currentVideo.name}
          </span>
        )}
      </div>

      {/* Video Container */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div ref={containerRef} className="relative w-full h-full flex items-center justify-center bg-black rounded-lg overflow-hidden shadow-2xl">
          <div className="relative aspect-video max-w-full max-h-full w-full h-full">
            {/* 视频元素始终保持挂载，避免频繁卸载导致的引用丢失和性能问题 */}
            <video
              ref={videoRef}
              className={cn(
                "w-full h-full object-contain bg-black",
                (!hasContent || !currentVideo || showResult) && "hidden"
              )}
              onTimeUpdate={handleTimeUpdate}
              onProgress={handleProgress}
              playsInline
              muted={isMuted}
            />

            <audio ref={audioRef} hidden />

            {/* AI 生成结果视频 */}
            {generatedVideoUrl && (
              <video
                ref={resultVideoRef}
                src={generatedVideoUrl}
                className={cn(
                  "w-full h-full object-contain bg-black",
                  (!showResult || isProcessing) && "hidden"
                )}
                onLoadedMetadata={(e) => {
                  const dur = e.currentTarget.duration
                  if (dur && !isNaN(dur)) {
                    setResultDuration(dur)
                  }
                }}
                onTimeUpdate={() => {
                  if (showResult && resultVideoRef.current && !isSeeking.current) {
                    setResultCurrentTime(resultVideoRef.current.currentTime)
                  }
                }}
                controls={false}
                playsInline
                muted={isMuted}
              />
            )}

            {/* AI Processing Overlay - 酷炫加载效果 */}
            {isProcessing && (
              <div className="absolute inset-0 z-40 bg-dark-900/90 backdrop-blur-md flex flex-col items-center justify-center overflow-hidden">
                {/* 背景扫描线动画 */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                  <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(124,58,237,0.1)_50%,transparent_100%)] bg-[length:100%_4px] animate-scanline" />
                </div>

                {/* 核心动画容器 */}
                <div className="relative w-64 h-64 flex items-center justify-center">
                  {/* 外圈旋转 */}
                  <div className="absolute inset-0 border-2 border-dashed border-accent-primary/30 rounded-full animate-[spin_10s_linear_infinite]" />
                  <div className="absolute inset-4 border border-accent-secondary/20 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                  
                  {/* 脉冲圆环 */}
                  <div className="absolute w-32 h-32 bg-accent-primary/10 rounded-full animate-ping" />
                  
                  {/* 中心图标 */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-[0_0_30px_rgba(124,58,237,0.5)] animate-bounce">
                      <Sparkles className="w-10 h-10 text-white" />
                    </div>
                  </div>

                  {/* 浮动的小图标 */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 animate-float-slow">
                    <Cpu className="w-6 h-6 text-accent-primary" />
                  </div>
                  <div className="absolute bottom-12 right-0 animate-float-delayed">
                    <Zap className="w-5 h-5 text-accent-secondary" />
                  </div>
                  <div className="absolute bottom-12 left-0 animate-float">
                    <Layers className="w-5 h-5 text-accent-primary" />
                  </div>
                </div>

                {/* 文字状态 */}
                <div className="mt-8 text-center z-10">
                  <h3 className="text-xl font-bold text-white tracking-widest mb-2 flex items-center gap-3">
                    <span className="inline-block w-2 h-2 bg-accent-primary rounded-full animate-pulse" />
                    AI 智能剪辑中
                    <span className="inline-block w-2 h-2 bg-accent-primary rounded-full animate-pulse delay-75" />
                  </h3>
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-accent-primary/80 text-sm font-mono animate-flicker">
                      ANALYZING EMOTIONS & BEATS...
                    </p>
                    <div className="w-48 h-1 bg-dark-700 rounded-full mt-4 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary animate-progress-loading" />
                    </div>
                  </div>
                </div>

                {/* 装饰性代码流 */}
                <div className="absolute bottom-8 left-8 text-[10px] font-mono text-accent-primary/30 pointer-events-none hidden md:block space-y-1">
                  <div className="animate-terminal-1">&gt; EXECUTING SEMANTIC_ANALYSIS...</div>
                  <div className="animate-terminal-2">&gt; MAPPING AUDIO_BEATS...</div>
                  <div className="animate-terminal-3">&gt; GENERATING TRANSITIONS...</div>
                  <div className="animate-terminal-4">&gt; OPTIMIZING VISUAL FLOW...</div>
                </div>
              </div>
            )}

            {/* 空白区域占位 */}
            {hasContent && !currentVideo && !showResult && (
              <div className="absolute inset-0 bg-dark-900 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center mb-4">
                  <Film className="w-8 h-8 text-dark-500" />
                </div>
                <p className="text-dark-400">当前时间点无内容</p>
                <p className="text-dark-500 text-xs mt-1">
                  {formatDuration(displayCurrentTime)} / {formatDuration(displayDuration)}
                </p>
              </div>
            )}

            {/* 时间轴为空占位 */}
            {!hasContent && !showResult && (
              <div className="absolute inset-0 bg-gradient-to-br from-dark-800 to-dark-900 flex flex-col items-center justify-center">
                <Clapperboard className="w-16 h-16 text-dark-500 mb-4" />
                <p className="text-dark-400">时间轴为空</p>
                <p className="text-dark-500 text-sm mt-1">从左侧素材库拖拽视频到时间轴</p>
              </div>
            )}

            {/* Play overlay when paused */}
            {((hasContent && !showResult) || showResult) && !isPlaying && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <button
                  onClick={handlePlayPause}
                  className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <Play className="w-10 h-10 text-white fill-white ml-1" />
                </button>
              </div>
            )}

            {/* Subtitle Overlay - 字幕区域 */}
            {currentVideo && (
              <div className="absolute bottom-16 left-0 right-0 text-center pointer-events-none">
                {/* 字幕会在这里显示 */}
              </div>
            )}

            {/* Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              {/* Progress Bar */}
              <div
                onClick={handleSeek}
                className="relative h-1 bg-white/30 rounded-full cursor-pointer mb-3 group"
              >
                {/* Buffer - 使用真实缓冲进度 */}
                <div
                  className="absolute h-full bg-white/40 rounded-full"
                  style={{ width: `${buffered}%` }}
                />
                {/* Progress */}
                <div
                  className="absolute h-full bg-accent-primary rounded-full"
                  style={{ width: `${displayDuration > 0 ? (displayCurrentTime / displayDuration) * 100 : 0}%` }}
                />
                {/* Thumb */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `calc(${displayDuration > 0 ? (displayCurrentTime / displayDuration) * 100 : 0}% - 6px)` }}
                />
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Play Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSkipBack}
                      className="p-1.5 rounded hover:bg-white/20 transition-colors"
                    >
                      <SkipBack className="w-5 h-5 text-white" />
                    </button>
                    <button
                      onClick={handlePlayPause}
                      className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 text-white" />
                      ) : (
                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                      )}
                    </button>
                    <button
                      onClick={handleSkipForward}
                      className="p-1.5 rounded hover:bg-white/20 transition-colors"
                    >
                      <SkipForward className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  {/* Time */}
                  <span className="text-sm text-white font-mono">
                    {formatDuration(displayCurrentTime)} / {formatDuration(displayDuration)}
                  </span>

                  {/* Volume */}
                  <div 
                    className="flex items-center gap-2 group/volume relative"
                    onMouseEnter={() => setShowVolumeSlider(true)}
                    onMouseLeave={() => setShowVolumeSlider(false)}
                  >
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-1.5 rounded hover:bg-white/20 transition-colors"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-5 h-5 text-white" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-white" />
                      )}
                    </button>
                    
                    {showVolumeSlider && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-dark-800 rounded-lg shadow-xl border border-dark-700 flex flex-col items-center gap-3 z-50">
                        {/* 鼠标移动桥接层，防止滑块消失 */}
                        <div className="absolute -bottom-2 left-0 right-0 h-2" />
                        
                        <div className="h-32 w-6 relative flex items-center justify-center">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="absolute w-32 h-1.5 -rotate-90 cursor-pointer accent-accent-primary bg-dark-600 rounded-lg appearance-none"
                            style={{ transformOrigin: 'center' }}
                          />
                        </div>
                        <span className="text-[10px] text-white font-mono w-8 text-center">{isMuted ? 0 : volume}%</span>
                      </div>
                    )}

                    <div 
                      className="w-20 h-1 bg-white/30 rounded-full overflow-hidden hidden md:block cursor-pointer"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const x = e.clientX - rect.left
                        const newVolume = Math.round((x / rect.width) * 100)
                        setVolume(newVolume)
                        if (newVolume > 0) setIsMuted(false)
                      }}
                    >
                      <div
                        className="h-full bg-white rounded-full"
                        style={{ width: isMuted ? 0 : `${volume}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Fullscreen */}
                  <button 
                    onClick={handleFullscreen}
                    className="p-1.5 rounded hover:bg-white/20 transition-colors"
                  >
                    <Maximize className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
