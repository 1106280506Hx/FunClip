import { useState, useRef } from 'react'
import {
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Film,
  Music,
  Type,
  Sparkles,
  X
} from 'lucide-react'
import { cn, formatDuration } from '../../utils/helpers'
import { useTimelineStore } from '../../store'
import { generateMockWaveform } from '../../data/mockData'
import type { TimelineTrack, TrackType, BeatMarker, TimelineClip } from '../../types'

export function Timeline() {
  const {
    tracks,
    beatMarkers,
    currentTime,
    duration,
    isPlaying,
    zoom,
    setCurrentTime,
    setIsPlaying,
    setZoom,
    setDuration,
    toggleTrackMute,
    toggleTrackLock,
    setTracks,
    removeClipFromTrack,
  } = useTimelineStore()

  const timelineRef = useRef<HTMLDivElement>(null)
  const headersRef = useRef<HTMLDivElement>(null)
  const [waveformData] = useState(() => generateMockWaveform(duration, 20))
  const [isDragOver, setIsDragOver] = useState(false)

  // 同步滚动
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headersRef.current) {
      headersRef.current.scrollTop = e.currentTarget.scrollTop
    }
  }

  // 拖拽预览状态
  const [dragPreview, setDragPreview] = useState<{
    x: number
    width: number
    name: string
    duration: number
  } | null>(null)

  // 拖拽片段状态
  const [draggingClip, setDraggingClip] = useState<{
    clipId: string
    trackId: string
    originalStartTime: number
  } | null>(null)

  // 不再需要模拟播放循环 - 依赖 VideoPreview 的真实视频时间更新

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const scrollLeft = timelineRef.current.scrollLeft
    const clickTime = ((x + scrollLeft) / (duration * 20 * zoom)) * duration
    setCurrentTime(Math.max(0, Math.min(duration, clickTime)))
  }

  // 拖拽悬停 - 显示预览（带吸附）
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)

    // 计算预览位置
    const rect = timelineRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const scrollLeft = timelineRef.current?.scrollLeft || 0

    // 获取拖拽片段的实际时长（如果是时间轴内片段拖拽）
    let previewDuration = 10 // 默认10秒
    let clipName = '视频片段'
    let isDraggingFromTimeline = false

    if (draggingClip) {
      // 从时间轴内拖拽
      const sourceTrack = tracks.find(t => t.id === draggingClip.trackId)
      const sourceClip = sourceTrack?.clips.find(c => c.id === draggingClip.clipId)
      if (sourceClip) {
        previewDuration = sourceClip.endTime - sourceClip.startTime
        clipName = `移动: 片段 ${sourceClip.id.split('-')[1]}`
        isDraggingFromTimeline = true
      }
      e.dataTransfer.dropEffect = 'move'
    } else {
      e.dataTransfer.dropEffect = 'copy'
    }

    const displayDur = Math.max(duration, 30)

    // 计算原始时间位置
    let rawTime = 0
    if (displayDur > 0) {
      rawTime = ((x + scrollLeft) / (displayDur * 20 * zoom)) * displayDur
    }
    rawTime = Math.max(0, rawTime)

    // 应用吸附到预览
    const snapThresholdTime = 10 / (20 * zoom)
    const videoTrack = tracks.find(t => t.type === 'video')
    const existingClips = videoTrack?.clips.filter(c =>
      !isDraggingFromTimeline || c.id !== draggingClip?.clipId
    ) || []
    const snapPoints: number[] = [0]
    existingClips.forEach(clip => {
      snapPoints.push(clip.startTime)
      snapPoints.push(clip.endTime)
    })

    let snappedTime = rawTime
    let isSnapped = false

    // 检查吸附
    for (const point of snapPoints) {
      if (Math.abs(rawTime - point) < snapThresholdTime) {
        snappedTime = point
        isSnapped = true
        break
      }
    }

    const previewX = snappedTime * 20 * zoom
    const previewWidth = previewDuration * 20 * zoom

    setDragPreview({
      x: previewX,
      width: previewWidth,
      name: isSnapped ? `📍 ${clipName}` : clipName,
      duration: previewDuration,
    })
  }

  // 拖拽离开 - 隐藏预览
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    setDragPreview(null)
  }

  // 吸附阈值（像素）
  const SNAP_THRESHOLD = 10

  // 计算吸附位置
  const getSnappedTime = (rawTime: number, clipDuration: number): number => {
    const snapThresholdTime = SNAP_THRESHOLD / (20 * zoom)

    // 获取所有现有片段的边界点
    const videoTrack = tracks.find(t => t.type === 'video')
    const existingClips = videoTrack?.clips || []

    // 收集所有吸附点：0、每个片段的开始和结束时间
    const snapPoints: number[] = [0]
    existingClips.forEach(clip => {
      snapPoints.push(clip.startTime)
      snapPoints.push(clip.endTime)
    })

    // 检查片段开始位置的吸附
    for (const point of snapPoints) {
      if (Math.abs(rawTime - point) < snapThresholdTime) {
        return point
      }
    }

    // 检查片段结束位置的吸附（让新片段的结束对齐到某个点）
    const rawEndTime = rawTime + clipDuration
    for (const point of snapPoints) {
      if (Math.abs(rawEndTime - point) < snapThresholdTime) {
        return point - clipDuration
      }
    }

    return rawTime
  }

  // 检测片段是否与其他片段重叠
  const checkOverlap = (clip: TimelineClip, trackClips: TimelineClip[]): boolean => {
    return trackClips.some(other =>
      other.id !== clip.id &&
      clip.startTime < other.endTime &&
      clip.endTime > other.startTime
    )
  }

  // 找到或创建不重叠的轨道
  const findOrCreateTrackForClip = (
    clip: TimelineClip,
    currentTracks: TimelineTrack[],
    preferredType: TrackType = 'video'
  ): TimelineTrack[] => {
    // 查找同类型的轨道
    const sameTracks = currentTracks.filter(t => t.type === preferredType)

    // 尝试在现有轨道中找到不重叠的位置
    for (const track of sameTracks) {
      if (!checkOverlap(clip, track.clips)) {
        // 可以放在这个轨道
        return currentTracks.map(t => {
          if (t.id === track.id) {
            return { ...t, clips: [...t.clips, clip] }
          }
          return t
        })
      }
    }

    // 所有同类型轨道都有重叠，创建新轨道
    const newTrackId = `track-${preferredType}-${Date.now()}`
    const newTrack: TimelineTrack = {
      id: newTrackId,
      type: preferredType,
      name: `${preferredType === 'video' ? '视频轨道' : preferredType === 'audio' ? '音频轨道' : '轨道'} ${sameTracks.length + 1}`,
      isMuted: false,
      isLocked: false,
      volume: 100,
      clips: [{ ...clip, trackId: newTrackId }],
    }

    // 在同类型轨道后面插入新轨道
    const lastSameTypeIndex = currentTracks.map(t => t.type).lastIndexOf(preferredType)
    const newTracks = [...currentTracks]
    newTracks.splice(lastSameTypeIndex + 1, 0, newTrack)
    return newTracks
  }

  // 处理片段拖拽开始（时间轴内的片段）
  const handleClipDragStart = (e: React.DragEvent, clip: TimelineClip, trackId: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'timeline-clip',
      clipId: clip.id,
      trackId: trackId,
      clipDuration: clip.endTime - clip.startTime,
      sourceId: clip.sourceId,
    }))
    e.dataTransfer.effectAllowed = 'move'
    setDraggingClip({
      clipId: clip.id,
      trackId: trackId,
      originalStartTime: clip.startTime,
    })
  }

  // 处理片段拖拽结束
  const handleClipDragEnd = () => {
    setDraggingClip(null)
    setDragPreview(null)
  }

  // 放置视频到时间轴
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    setDragPreview(null)
    setDraggingClip(null)

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))

      // 计算放置位置对应的时间
      const rect = timelineRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = e.clientX - rect.left
      const scrollLeft = timelineRef.current?.scrollLeft || 0

      // 计算基础放置时间
      let rawDropTime = 0
      const displayDur = Math.max(duration, 30)
      if (displayDur > 0) {
        rawDropTime = ((x + scrollLeft) / (displayDur * 20 * zoom)) * displayDur
      }
      rawDropTime = Math.max(0, rawDropTime)

      if (data.type === 'video') {
        // 从素材库拖入的新片段
        console.log('Dropping video clip:', {
          videoId: data.videoId,
          videoDuration: data.videoDuration,
          dropTime: rawDropTime,
          path: data.videoPath
        })

        const dropTime = getSnappedTime(rawDropTime, data.videoDuration)

        const newClip: TimelineClip = {
          id: `clip-${Date.now()}`,
          trackId: 'track-video-1',
          sourceId: data.videoId,
          startTime: dropTime,
          endTime: dropTime + data.videoDuration,
          sourceStart: 0,
          sourceEnd: data.videoDuration,
        }

        console.log('Created clip:', newClip)

        // 使用智能轨道放置（处理重叠）
        const updatedTracks = findOrCreateTrackForClip(newClip, tracks, 'video')
        setTracks(updatedTracks)

        // 自动更新时间轴时长
        const allClips = updatedTracks.flatMap(t => t.clips)
        const maxEndTime = Math.max(...allClips.map(c => c.endTime), 0)
        if (maxEndTime > duration || duration === 0) {
          setDuration(maxEndTime + 5)
        }
      } else if (data.type === 'shot') {
        // 从片段预览拖入的新片段
        console.log('Dropping shot clip:', data)

        const dropTime = getSnappedTime(rawDropTime, data.duration)

        const newClip: TimelineClip = {
          id: `clip-shot-${Date.now()}`,
          trackId: 'track-video-1',
          sourceId: data.videoId,
          startTime: dropTime,
          endTime: dropTime + data.duration,
          sourceStart: data.startTime,
          sourceEnd: data.endTime,
        }

        console.log('Created shot clip:', newClip)

        // 使用智能轨道放置（处理重叠）
        const updatedTracks = findOrCreateTrackForClip(newClip, tracks, 'video')
        setTracks(updatedTracks)

        // 自动更新时间轴时长
        const allClips = updatedTracks.flatMap(t => t.clips)
        const maxEndTime = Math.max(...allClips.map(c => c.endTime), 0)
        if (maxEndTime > duration || duration === 0) {
          setDuration(maxEndTime + 5)
        }
      } else if (data.type === 'music') {
        // 从音乐库拖入的新音频片段
        console.log('Dropping music clip:', data)

        // 解析时长 "4:10" -> 250
        const [mins, secs] = data.data.duration.split(':').map(Number)
        const musicDuration = mins * 60 + secs
        const dropTime = getSnappedTime(rawDropTime, musicDuration)

        const newClip: TimelineClip = {
          id: `clip-music-${Date.now()}`,
          trackId: 'track-audio-1',
          sourceId: data.data.path, // 使用路径作为 sourceId
          startTime: dropTime,
          endTime: dropTime + musicDuration,
          sourceStart: 0,
          sourceEnd: musicDuration,
        }

        // 使用智能轨道放置（处理重叠）
        const updatedTracks = findOrCreateTrackForClip(newClip, tracks, 'audio')
        setTracks(updatedTracks)

        // 自动更新时间轴时长
        const allClips = updatedTracks.flatMap(t => t.clips)
        const maxEndTime = Math.max(...allClips.map(c => c.endTime), 0)
        if (maxEndTime > duration || duration === 0) {
          setDuration(maxEndTime + 5)
        }
      } else if (data.type === 'timeline-clip') {
        // 时间轴内片段的移动
        const clipDuration = data.clipDuration
        const dropTime = getSnappedTime(rawDropTime, clipDuration)

        // 先从原轨道移除片段
        let movedClip: TimelineClip | null = null
        let tracksWithoutClip = tracks.map(track => {
          const clipIndex = track.clips.findIndex(c => c.id === data.clipId)
          if (clipIndex !== -1) {
            movedClip = {
              ...track.clips[clipIndex],
              startTime: dropTime,
              endTime: dropTime + clipDuration,
            }
            return {
              ...track,
              clips: track.clips.filter(c => c.id !== data.clipId)
            }
          }
          return track
        })

        // 清理空轨道（保留第一个视频轨道和第一个音频轨道）
        const videoTracks = tracksWithoutClip.filter(t => t.type === 'video')
        const audioTracks = tracksWithoutClip.filter(t => t.type === 'audio')
        const firstVideoTrackId = videoTracks[0]?.id
        const firstAudioTrackId = audioTracks[0]?.id

        tracksWithoutClip = tracksWithoutClip.filter(track =>
          track.clips.length > 0 ||
          track.id === firstVideoTrackId ||
          track.id === firstAudioTrackId
        )

        if (movedClip) {
          // 使用智能轨道放置（处理重叠）
          const trackType = tracks.find(t => t.id === data.trackId)?.type || 'video'
          const updatedTracks = findOrCreateTrackForClip(movedClip, tracksWithoutClip, trackType)
          setTracks(updatedTracks)

          // 更新时间轴时长
          const allClips = updatedTracks.flatMap(t => t.clips)
          const maxEndTime = Math.max(...allClips.map(c => c.endTime), 0)
          if (maxEndTime > duration) {
            setDuration(maxEndTime + 5)
          }
        }
      }
    } catch (err) {
      console.error('Failed to parse drag data:', err)
    }
  }

  const pixelsPerSecond = 20 * zoom
  // 确保时间轴有最小显示宽度（至少显示30秒刻度，或实际时长）
  const displayDuration = Math.max(duration, 30)
  const timelineWidth = displayDuration * pixelsPerSecond

  return (
    <div className="h-full flex flex-col bg-dark-800">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-dark-700">
        <div className="flex items-center gap-4">
          {/* Playback controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-white" />
              ) : (
                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
              )}
            </button>
            <span className="text-sm font-mono text-dark-200 min-w-20">
              {formatDuration(currentTime)}
            </span>
          </div>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(zoom - 0.2)}
            className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
            disabled={zoom <= 0.2}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-dark-400 min-w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(zoom + 0.2)}
            className="p-1.5 rounded hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
            disabled={zoom >= 3}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 flex min-h-0">
        {/* Track Headers */}
        <div
          ref={headersRef}
          className="w-40 flex-shrink-0 border-r border-dark-700 overflow-y-hidden relative bg-dark-900"
        >
          {/* Time ruler header */}
          <div className="h-6 border-b border-dark-700 sticky top-0 bg-dark-800 z-30" />

          {/* Track headers */}
          {tracks.map((track) => (
            <TrackHeader
              key={track.id}
              track={track}
              onToggleMute={() => toggleTrackMute(track.id)}
              onToggleLock={() => toggleTrackLock(track.id)}
            />
          ))}
        </div>

        {/* Timeline Tracks */}
        <div
          ref={timelineRef}
          onScroll={handleScroll}
          className={cn(
            'flex-1 overflow-auto relative transition-colors',
            isDragOver && 'bg-accent-primary/10 ring-2 ring-accent-primary/50 ring-inset'
          )}
          onClick={handleTimelineClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* 拖拽提示 */}
          {isDragOver && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="bg-accent-primary/90 text-white px-4 py-2 rounded-lg shadow-lg">
                释放以添加到时间轴
              </div>
            </div>
          )}

          <div className="relative" style={{ width: timelineWidth, minWidth: '100%' }}>
            {/* Time Ruler */}
            <TimeRuler duration={displayDuration} zoom={zoom} />

            {/* Tracks Container - relative for beat markers and playhead */}
            <div className="relative">
              {/* Tracks */}
              {tracks.map((track, index) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  zoom={zoom}
                  waveformData={index === 1 ? waveformData : undefined}
                  onClipDragStart={handleClipDragStart}
                  onClipDragEnd={handleClipDragEnd}
                  draggingClipId={draggingClip?.clipId}
                  onClipDelete={removeClipFromTrack}
                />
              ))}

              {/* 拖拽预览方块 */}
              {dragPreview && (
                <div
                  className="absolute top-0 h-16 pointer-events-none z-50 transition-all duration-75"
                  style={{
                    left: dragPreview.x,
                    width: dragPreview.width,
                  }}
                >
                  {/* 预览方块 */}
                  <div className="h-full bg-accent-primary/40 border-2 border-accent-primary border-dashed rounded-lg flex items-center justify-center">
                    <div className="text-xs text-white font-medium bg-accent-primary/80 px-2 py-1 rounded">
                      {dragPreview.name}
                    </div>
                  </div>
                  {/* 时间指示器 */}
                  <div className="absolute -bottom-5 left-0 text-[10px] text-accent-primary font-mono">
                    {formatDuration(dragPreview.x / (20 * zoom))}
                  </div>
                </div>
              )}

              {/* Beat Markers - now inside tracks container */}
              <BeatMarkersOverlay
                markers={beatMarkers}
                zoom={zoom}
                trackCount={tracks.length}
              />

              {/* Playhead - now inside tracks container */}
              <Playhead
                currentTime={currentTime}
                zoom={zoom}
                trackCount={tracks.length}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Track Header Component
interface TrackHeaderProps {
  track: TimelineTrack
  onToggleMute: () => void
  onToggleLock: () => void
}

function TrackHeader({ track, onToggleMute, onToggleLock }: TrackHeaderProps) {
  const iconMap: Record<TrackType, React.ReactNode> = {
    video: <Film className="w-4 h-4" />,
    audio: <Music className="w-4 h-4" />,
    subtitle: <Type className="w-4 h-4" />,
    effect: <Sparkles className="w-4 h-4" />,
  }

  const colorMap: Record<TrackType, string> = {
    video: 'text-blue-400',
    audio: 'text-green-400',
    subtitle: 'text-yellow-400',
    effect: 'text-purple-400',
  }

  return (
    <div className="h-16 px-3 py-2 border-b border-dark-700 flex flex-col justify-center">
      <div className="flex items-center gap-2">
        <span className={colorMap[track.type]}>{iconMap[track.type]}</span>
        <span className="text-sm text-dark-200 truncate">{track.name}</span>
      </div>
      <div className="flex items-center gap-1 mt-1">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleMute()
          }}
          className={cn(
            'p-1 rounded transition-colors',
            track.isMuted
              ? 'text-accent-error'
              : 'text-dark-500 hover:text-dark-300'
          )}
        >
          {track.isMuted ? (
            <VolumeX className="w-3 h-3" />
          ) : (
            <Volume2 className="w-3 h-3" />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleLock()
          }}
          className={cn(
            'p-1 rounded transition-colors',
            track.isLocked
              ? 'text-accent-warning'
              : 'text-dark-500 hover:text-dark-300'
          )}
        >
          {track.isLocked ? (
            <Lock className="w-3 h-3" />
          ) : (
            <Unlock className="w-3 h-3" />
          )}
        </button>
      </div>
    </div>
  )
}

// Time Ruler Component
interface TimeRulerProps {
  duration: number
  zoom: number
}

function TimeRuler({ duration, zoom }: TimeRulerProps) {
  const pixelsPerSecond = 20 * zoom
  const markers: number[] = []
  const interval = zoom > 1 ? 1 : zoom > 0.5 ? 2 : 5

  for (let i = 0; i <= duration; i += interval) {
    markers.push(i)
  }

  return (
    <div className="h-6 border-b border-dark-700 relative bg-dark-800 sticky top-0 z-30">
      {markers.map((time) => (
        <div
          key={time}
          className="absolute top-0 h-full flex flex-col items-center"
          style={{ left: time * pixelsPerSecond }}
        >
          <div className="h-2 w-px bg-dark-500" />
          <span className="text-[10px] text-dark-500 mt-0.5">
            {formatDuration(time)}
          </span>
        </div>
      ))}
    </div>
  )
}

// Track Row Component
interface TrackRowProps {
  track: TimelineTrack
  zoom: number
  waveformData?: number[]
  onClipDragStart?: (e: React.DragEvent, clip: TimelineClip, trackId: string) => void
  onClipDragEnd?: () => void
  draggingClipId?: string
  onClipDelete?: (trackId: string, clipId: string) => void
}

function TrackRow({ track, zoom, waveformData, onClipDragStart, onClipDragEnd, draggingClipId, onClipDelete }: TrackRowProps) {
  const pixelsPerSecond = 20 * zoom

  const colorMap: Record<TrackType, string> = {
    video: 'bg-blue-500/30 border-blue-500/50',
    audio: 'bg-green-500/30 border-green-500/50',
    subtitle: 'bg-yellow-500/30 border-yellow-500/50',
    effect: 'bg-purple-500/30 border-purple-500/50',
  }

  const handleDragStart = (e: React.DragEvent, clip: TimelineClip) => {
    if (track.isLocked) {
      e.preventDefault()
      return
    }
    onClipDragStart?.(e, clip, track.id)
  }

  return (
    <div className="h-16 border-b border-dark-700 relative">
      {/* Clips */}
      {track.clips.map((clip) => (
        <div
          key={clip.id}
          draggable={!track.isLocked}
          onDragStart={(e) => handleDragStart(e, clip)}
          onDragEnd={() => onClipDragEnd?.()}
          className={cn(
            'absolute top-1 bottom-1 rounded border cursor-move transition-all hover:brightness-110',
            colorMap[track.type],
            track.isLocked && 'opacity-50 cursor-not-allowed',
            draggingClipId === clip.id && 'opacity-50 ring-2 ring-white/50',
            'group'
          )}
          style={{
            left: clip.startTime * pixelsPerSecond,
            width: (clip.endTime - clip.startTime) * pixelsPerSecond,
          }}
        >
          {/* Waveform for audio tracks */}
          {track.type === 'audio' && waveformData && (
            <div className="absolute inset-0 flex items-end overflow-hidden px-1">
              {waveformData.slice(0, Math.floor((clip.endTime - clip.startTime) * 20)).map((value, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-1 mx-px bg-green-400/60 rounded-t"
                  style={{ height: `${value * 100}%` }}
                />
              ))}
            </div>
          )}

          {/* Clip label */}
          <div className="absolute top-1 left-2 text-[10px] text-white/80 truncate max-w-full pr-8">
            {track.type === 'subtitle' ? '字幕' : `片段 ${clip.id.split('-')[1]}`}
          </div>

          {/* Delete button */}
          {!track.isLocked && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClipDelete?.(track.id, clip.id)
              }}
              className="absolute top-1 right-1 p-0.5 rounded bg-red-500/60 hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
              title="删除片段"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          )}

          {/* Transition indicator */}
          {clip.transition && clip.transition.type !== 'none' && (
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-white/30 rounded-l" />
          )}
        </div>
      ))}
    </div>
  )
}

// Beat Markers Overlay
interface BeatMarkersOverlayProps {
  markers: BeatMarker[]
  zoom: number
  trackCount: number
}

function BeatMarkersOverlay({ markers, zoom, trackCount }: BeatMarkersOverlayProps) {
  const pixelsPerSecond = 20 * zoom
  const overlayHeight = trackCount * 64 // only tracks height

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ height: overlayHeight }}>
      {markers.map((marker) => (
        <div
          key={marker.id}
          className={cn(
            'absolute top-0 w-0.5 transition-opacity',
            marker.isSnapped
              ? 'bg-beat-marker opacity-100'
              : 'bg-beat-marker/50 opacity-60'
          )}
          style={{
            left: marker.timestamp * pixelsPerSecond,
            height: '100%',
            boxShadow: marker.strength > 0.8 ? '0 0 4px rgba(250, 204, 21, 0.5)' : 'none',
          }}
        />
      ))}
    </div>
  )
}

// Playhead Component
interface PlayheadProps {
  currentTime: number
  zoom: number
  trackCount: number
}

function Playhead({ currentTime, zoom, trackCount }: PlayheadProps) {
  const pixelsPerSecond = 20 * zoom
  const position = currentTime * pixelsPerSecond
  const height = trackCount * 64 // only tracks height

  return (
    <div
      className="absolute top-0 pointer-events-none z-40"
      style={{ left: position, height }}
    >
      {/* Playhead triangle */}
      <div className="sticky top-0 -ml-2 -mt-1 w-4 h-3 bg-accent-primary" style={{
        clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
      }} />
      {/* Playhead line */}
      <div className="absolute left-0 top-0 w-0.5 bg-accent-primary" style={{ height }} />
    </div>
  )
}
