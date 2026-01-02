import { useState, useRef, useEffect } from 'react'
import {
  Search,
  Play,
  Check,
  Film,
  GripVertical,
  Image as ImageIcon,
  Sparkles,
  Upload,
  Plus,
  X
} from 'lucide-react'
import { cn, getTagColor, formatDuration } from '../../utils/helpers'
import { useMediaStore, useSearchStore, useProjectStore } from '../../store'
import type { KeyFrame, VideoFile } from '../../types'
import { mockDaliShots } from '../../data/mockData'

export function SemanticPanel() {
  const keyFrames = useMediaStore((state) => state.keyFrames)
  const videos = useMediaStore((state) => state.videos)
  const { searchResults, searchQuery } = useSearchStore()
  const [previewShot, setPreviewShot] = useState<KeyFrame | null>(null)

  const displayKeyFrames = searchQuery.trim() ? searchResults : keyFrames

  useEffect(() => {
    const handlePreview = (e: any) => {
      setPreviewShot(e.detail)
    }
    window.addEventListener('preview-shot', handlePreview)
    return () => window.removeEventListener('preview-shot', handlePreview)
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-dark-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">语义分析</h2>
        </div>

        {/* Search */}
        <SemanticSearch />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <VideoClipsList videos={videos} keyFrames={displayKeyFrames} />
      </div>

      {/* Shot Preview Modal */}
      {previewShot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl bg-dark-800 rounded-xl overflow-hidden shadow-2xl border border-dark-700">
            <button
              onClick={() => setPreviewShot(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="aspect-video bg-black">
              <video
                src={previewShot.thumbnail}
                className="w-full h-full"
                controls
                autoPlay
              />
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">片段预览</h3>
                  <p className="text-sm text-dark-400">
                    时间段: {formatDuration(previewShot.tags[0]?.startTime || 0)} - {formatDuration(previewShot.tags[0]?.endTime || 0)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {previewShot.tags.map(tag => (
                    <span
                      key={tag.id}
                      className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        getTagColor(tag.category)
                      )}
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Semantic Search Component
function SemanticSearch() {
  const { searchQuery, setSearchQuery, performSearch, isSearching } = useSearchStore()

  // 实时搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, performSearch])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(searchQuery)
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="搜索：找一段日落的画面..."
        className="input input-search pr-10"
      />
      {searchQuery && !isSearching && (
        <button
          type="button"
          onClick={() => setSearchQuery('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {isSearching && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </form>
  )
}

// Key Frame Card Component
interface KeyFrameCardProps {
  keyFrame: KeyFrame
  onToggle: () => void
  onDragStart?: (e: React.DragEvent) => void
}

function KeyFrameCard({ keyFrame, onToggle, onDragStart }: KeyFrameCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const videoThumbRef = useRef<HTMLVideoElement>(null)

  // 当视频加载完成时，跳到第一帧
  useEffect(() => {
    const videoEl = videoThumbRef.current
    if (!videoEl || videoError) return

    const handleLoadedMetadata = () => {
      videoEl.currentTime = 0.1
    }

    videoEl.addEventListener('loadedmetadata', handleLoadedMetadata)
    return () => videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata)
  }, [videoError, keyFrame.thumbnail])

  // 悬停播放逻辑
  useEffect(() => {
    const videoEl = videoThumbRef.current
    if (!videoEl || !keyFrame.thumbnail.endsWith('.mp4')) return

    if (isHovered) {
      videoEl.play().catch(() => { })
    } else {
      videoEl.pause()
      videoEl.currentTime = 0.1
    }
  }, [isHovered, keyFrame.thumbnail])

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onClick={onToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative rounded-lg overflow-hidden cursor-pointer transition-all',
        keyFrame.isSelected
          ? 'ring-2 ring-accent-primary'
          : 'hover:ring-1 hover:ring-dark-500'
      )}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-dark-700">
        {keyFrame.thumbnail.endsWith('.mp4') && !videoError ? (
          <video
            ref={videoThumbRef}
            src={keyFrame.thumbnail}
            className="w-full h-full object-cover"
            muted
            loop
            playsInline
            preload="metadata"
            onError={() => setVideoError(true)}
          />
        ) : (
          <img
            src={keyFrame.thumbnail}
            alt={`片段预览 ${formatDuration(keyFrame.tags[0]?.startTime || 0)} - ${formatDuration(keyFrame.tags[0]?.endTime || 0)}`}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Overlay */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity',
        isHovered ? 'opacity-100' : 'opacity-70'
      )}>
        {/* Time badge */}
        <div className="absolute bottom-2 left-2 text-xs text-white font-medium">
          {formatDuration(keyFrame.tags[0]?.startTime || 0)} - {formatDuration(keyFrame.tags[0]?.endTime || 0)}
        </div>

        {/* Play button on hover */}
        {isHovered && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div
              className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/40 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                // 这里可以触发大图预览
                const event = new CustomEvent('preview-shot', { detail: keyFrame })
                window.dispatchEvent(event)
              }}
            >
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            </div>
          </div>
        )}

        {/* Selection indicator */}
        {keyFrame.isSelected && (
          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent-primary flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Tags */}
      {isHovered && keyFrame.tags.length > 0 && (
        <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[80%]">
          {keyFrame.tags.slice(0, 2).map((tag) => (
            <span
              key={tag.id}
              className="px-1.5 py-0.5 text-[10px] rounded bg-black/60 text-white"
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// Video Clips List Component - 视频素材列表，支持拖拽
interface VideoClipsListProps {
  videos: VideoFile[]
  keyFrames: KeyFrame[]
}

function VideoClipsList({ videos, keyFrames }: VideoClipsListProps) {
  const addVideo = useMediaStore((state) => state.addVideo)
  const removeVideo = useMediaStore((state) => state.removeVideo)
  const currentProject = useProjectStore((state) => state.currentProject)
  const updateProject = useProjectStore((state) => state.updateProject)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  // 开始拖拽视频
  const handleDragStart = (e: React.DragEvent, video: VideoFile) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'video',
      videoId: video.id,
      videoName: video.name,
      videoDuration: video.duration,
      videoPath: video.path,
    }))
    e.dataTransfer.effectAllowed = 'copy'
  }

  // 点击预览视频
  const handlePreview = (video: VideoFile) => {
    // 使用自定义事件触发预览
    const event = new CustomEvent('preview-shot', {
      detail: {
        id: video.id,
        thumbnail: video.path,
        timestamp: 0,
        tags: [],
        isSelected: false
      }
    })
    window.dispatchEvent(event)
  }

  // 本地选择视频文件（不上传到后端）
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (!currentProject) {
      console.error('No current project')
      return
    }

    setIsUploading(true)

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('video/')) continue

        // 使用本地 URL 而不是上传到后端
        const videoUrl = URL.createObjectURL(file)
        const videoId = `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        // 创建视频元素来获取元数据和缩略图
        const video = document.createElement('video')
        video.preload = 'metadata'
        video.muted = true

        await new Promise<void>((resolve) => {
          video.onloadeddata = async () => {
            // 截取第一帧作为缩略图
            let thumbnail = ''
            try {
              video.currentTime = 0.1

              await new Promise<void>((res) => {
                video.onseeked = () => res()
                setTimeout(res, 500)
              })

              const canvas = document.createElement('canvas')
              canvas.width = video.videoWidth
              canvas.height = video.videoHeight
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                thumbnail = canvas.toDataURL('image/jpeg', 0.7)
              }
            } catch (err) {
              console.warn('Failed to capture thumbnail:', err)
            }

            // 添加到本地状态
            const newVideo: VideoFile = {
              id: videoId,
              name: file.name,
              path: videoUrl,
              duration: video.duration,
              width: video.videoWidth,
              height: video.videoHeight,
              fps: 30,
              size: file.size,
              format: file.name.split('.').pop() || 'mp4',
              thumbnail: thumbnail || '',
              createdAt: new Date(),
              status: 'ready',
            }

            addVideo(newVideo)

            // 如果是第一个素材，自动设置为项目封面
            if (videos.length === 0 && thumbnail) {
              updateProject(currentProject.id, { thumbnail }).catch(console.error)
            }

            resolve()
          }
          video.onerror = (err) => {
            console.error('Failed to load video:', err)
            // 即使加载失败也添加视频到列表
            const newVideo: VideoFile = {
              id: videoId,
              name: file.name,
              path: videoUrl,
              duration: 0,
              width: 1920,
              height: 1080,
              fps: 30,
              size: file.size,
              format: file.name.split('.').pop() || 'mp4',
              thumbnail: '',
              createdAt: new Date(),
              status: 'ready',
            }
            addVideo(newVideo)
            resolve()
          }
          video.src = videoUrl
        })
      }
    } catch (error) {
      console.error('Failed to add video:', error)
      alert('添加视频失败，请重试')
    } finally {
      setIsUploading(false)
      // 清空 input 以便重新选择相同文件
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 删除视频
  const handleRemoveVideo = (id: string) => {
    removeVideo(id)
  }

  return (
    <div className="space-y-4">
      {/* 视频素材列表 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-medium text-dark-400 uppercase tracking-wider">
            视频素材 ({videos.length})
          </h4>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-dark-700 hover:bg-dark-600 text-dark-300 hover:text-white transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <div className="w-3 h-3 border-2 border-dark-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
            添加
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* 空状态 */}
        {videos.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-dark-600 rounded-lg cursor-pointer hover:border-dark-500 transition-colors"
          >
            <Upload className="w-8 h-8 text-dark-500 mb-2" />
            <p className="text-sm text-dark-400">点击或拖拽上传视频</p>
            <p className="text-xs text-dark-500 mt-1">支持 MP4, MOV, AVI 等格式</p>
          </div>
        ) : (
          videos.map((video) => (
            <VideoClipCard
              key={video.id}
              video={video}
              onDragStart={(e) => handleDragStart(e, video)}
              onPreview={() => handlePreview(video)}
              onRemove={() => handleRemoveVideo(video.id)}
            />
          ))
        )}
      </div>

      {/* 片段预览区域 - 空状态等待API */}
      <KeyFramesSection keyFrames={keyFrames} />
    </div>
  )
}

// 片段预览区域组件
function KeyFramesSection({ keyFrames }: { keyFrames: KeyFrame[] }) {
  const [isLoading, setIsLoading] = useState(false)
  const setKeyFrames = useMediaStore((state) => state.setKeyFrames)
  const selectAllKeyFrames = useMediaStore((state) => state.selectAllKeyFrames)
  const toggleKeyFrameSelection = useMediaStore((state) => state.toggleKeyFrameSelection)
  const { searchQuery } = useSearchStore()

  const allSelected = keyFrames.length > 0 && keyFrames.every(kf => kf.isSelected)

  const handleExtractKeyFrames = async () => {
    setIsLoading(true)

    // 模拟 API 调用延迟
    setTimeout(() => {
      setIsLoading(false)
      // 加载大理旅拍的模拟数据
      setKeyFrames(mockDaliShots)
    }, 1500)
  }

  // 处理片段拖拽
  const handleShotDragStart = (e: React.DragEvent, shot: KeyFrame) => {
    // 计算片段时长
    const duration = shot.tags[0]?.endTime - shot.tags[0]?.startTime || 5

    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'shot',
      shotId: shot.id,
      videoId: shot.videoId,
      startTime: shot.tags[0]?.startTime || 0,
      endTime: shot.tags[0]?.endTime || 5,
      duration: duration,
      thumbnail: shot.thumbnail,
    }))
    e.dataTransfer.effectAllowed = 'copy'
  }

  // 如果有片段预览数据，显示片段预览网格
  if (keyFrames.length > 0) {
    return (
      <div className="pt-4 border-t border-dark-700">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-medium text-dark-400 uppercase tracking-wider">
            {searchQuery ? `搜索结果 (${keyFrames.length})` : `片段预览 (${keyFrames.length})`}
          </h4>
          <button
            onClick={() => selectAllKeyFrames(!allSelected)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors",
              allSelected
                ? "bg-accent-primary/20 text-accent-primary"
                : "text-dark-400 hover:text-white hover:bg-dark-700"
            )}
          >
            <Check className={cn("w-3.5 h-3.5", !allSelected && "opacity-0")} />
            全选
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {keyFrames.map((kf) => (
            <KeyFrameCard
              key={kf.id}
              keyFrame={kf}
              onToggle={() => toggleKeyFrameSelection(kf.id)}
              onDragStart={(e) => handleShotDragStart(e, kf)}
            />
          ))}
        </div>
      </div>
    )
  }

  // 搜索无结果状态
  if (searchQuery) {
    return (
      <div className="pt-4 border-t border-dark-700">
        <h4 className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-3">
          搜索结果
        </h4>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="w-8 h-8 text-dark-600 mb-3" />
          <p className="text-sm text-dark-400">未找到匹配 "{searchQuery}" 的片段</p>
          {keyFrames.length === 0 ? (
            <p className="text-xs text-accent-primary mt-2 animate-pulse">
              提示：请先点击下方的“提取片段预览”按钮
            </p>
          ) : (
            <p className="text-xs text-dark-500 mt-1">尝试搜索其他关键词，如“日落”、“自然”等</p>
          )}
        </div>
      </div>
    )
  }

  // 空状态
  return (
    <div className="pt-4 border-t border-dark-700">
      <h4 className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-3">
        片段预览
      </h4>
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-dark-700 flex items-center justify-center mb-3">
          <ImageIcon className="w-6 h-6 text-dark-500" />
        </div>
        <p className="text-xs text-dark-500 mb-3">
          自动提取视频片段预览
        </p>
        <button
          onClick={handleExtractKeyFrames}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-dark-700 text-dark-300 hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {isLoading ? (
            <>
              <div className="w-3 h-3 border-2 border-dark-400 border-t-transparent rounded-full animate-spin" />
              提取中...
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3" />
              提取片段预览
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// Video Clip Card - 单个视频素材卡片
interface VideoClipCardProps {
  video: VideoFile
  onDragStart: (e: React.DragEvent) => void
  onPreview: () => void
  onRemove?: () => void
}

function VideoClipCard({ video, onDragStart, onPreview, onRemove }: VideoClipCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const videoThumbRef = useRef<HTMLVideoElement>(null)

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // 当视频加载完成时，跳到第一帧
  useEffect(() => {
    const videoEl = videoThumbRef.current
    if (!videoEl || videoError) return

    const handleLoadedMetadata = () => {
      videoEl.currentTime = 0.1
    }

    videoEl.addEventListener('loadedmetadata', handleLoadedMetadata)
    return () => videoEl.removeEventListener('loadedmetadata', handleLoadedMetadata)
  }, [videoError])

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg cursor-grab transition-all',
        'bg-dark-700/50 hover:bg-dark-700 border border-transparent',
        isHovered && 'border-accent-primary/50'
      )}
    >
      {/* 拖拽手柄 */}
      <div className="flex-shrink-0 text-dark-500">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* 缩略图 */}
      <div
        className="relative w-16 h-10 rounded overflow-hidden flex-shrink-0 bg-dark-600"
        onClick={onPreview}
      >
        {video.thumbnail && video.thumbnail.startsWith('data:') ? (
          // Base64 缩略图（上传时生成的）
          <img
            src={video.thumbnail}
            alt={video.name}
            className="w-full h-full object-cover"
            onError={() => setVideoError(true)}
          />
        ) : video.path && !videoError ? (
          // 使用视频第一帧作为缩略图
          <video
            ref={videoThumbRef}
            src={video.path}
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
            onError={(e) => {
              console.error('Video thumbnail load error:', e)
              setVideoError(true)
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-5 h-5 text-dark-400" />
          </div>
        )}

        {/* 时长标签 */}
        <div className="absolute bottom-0 right-0 px-1 py-0.5 bg-black/70 text-[10px] text-white">
          {formatDuration(video.duration)}
        </div>

        {/* 播放按钮悬停 */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Play className="w-4 h-4 text-white fill-white" />
          </div>
        )}
      </div>

      {/* 视频信息 */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{video.name}</div>
        <div className="text-[10px] text-dark-400">
          {video.width}×{video.height} · {formatFileSize(video.size)}
        </div>
      </div>

      {/* 删除按钮 */}
      {onRemove && isHovered && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="flex-shrink-0 p-1 rounded hover:bg-dark-600 text-dark-400 hover:text-red-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
