import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { SemanticPanel } from '../components/editor/SemanticPanel'
import { AIDirectorPanel } from '../components/editor/AIDirectorPanel'
import { VideoPreview } from '../components/editor/VideoPreview'
import { Timeline } from '../components/editor/Timeline'
import { ExportModal } from '../components/editor/ExportModal'
import { useUIStore, useProjectStore, useExportStore, useMediaStore } from '../store'
import { mockProjects, mockVideos, mockEmotions, mockStyles } from '../data/mockData'
import type { Project } from '../types'
import { cn } from '../utils/helpers'
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react'

export function Editor() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject)
  const addVideo = useMediaStore((state) => state.addVideo)
  const clearVideos = useMediaStore((state) => state.clearVideos)
  const showExportModal = useExportStore((state) => state.showExportModal)

  const {
    leftPanelWidth,
    rightPanelWidth,
    timelineHeight,
    isLeftPanelCollapsed,
    isRightPanelCollapsed,
    toggleLeftPanel,
    toggleRightPanel,
    setTimelineHeight,
  } = useUIStore()

  const [isResizingTimeline, setIsResizingTimeline] = useState(false)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingTimeline) return
      // 计算新的高度：窗口高度 - 鼠标当前位置
      const newHeight = window.innerHeight - e.clientY
      setTimelineHeight(newHeight)
    }

    const handleMouseUp = () => {
      setIsResizingTimeline(false)
    }

    if (isResizingTimeline) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'row-resize'
    } else {
      document.body.style.cursor = ''
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
    }
  }, [isResizingTimeline, setTimelineHeight])

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load project from backend
  useEffect(() => {
    if (!projectId) {
      navigate('/')
      return
    }

    const loadProject = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Clear existing videos before loading
        clearVideos()

        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 300))

        // 从 mock 数据中查找项目，如果找不到则创建新项目
        let project = mockProjects.find(p => p.id === projectId)
        if (!project) {
          // 创建一个新的项目
          project = {
            id: projectId,
            name: '新建项目',
            createdAt: new Date(),
            updatedAt: new Date(),
            thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=300&h=200&fit=crop',
            videos: [],
            timeline: [],
            subtitles: [],
            beatMarkers: [],
            emotionConfig: mockEmotions[0],
            styleConfig: mockStyles[0],
            exportHistory: [],
          }
        }

        setCurrentProject(project)

        // 加载 mock 视频到媒体库
        mockVideos.forEach((video) => {
          addVideo(video)
        })
      } catch (err) {
        console.error('Failed to load project:', err)
        setError('项目加载失败')
        // Redirect to dashboard after 2 seconds
        setTimeout(() => navigate('/'), 2000)
      } finally {
        setIsLoading(false)
      }
    }

    loadProject()
  }, [projectId, setCurrentProject, addVideo, clearVideos, navigate])

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mx-auto mb-4"></div>
          <p className="text-dark-400">加载项目中...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-2">{error}</p>
          <p className="text-dark-400 text-sm">2秒后返回主页...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-dark-900">
      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel - Semantic Analysis */}
        <div
          className={cn(
            'flex-shrink-0 border-r border-dark-700 bg-dark-800 transition-all duration-300 overflow-hidden',
            isLeftPanelCollapsed ? 'w-0' : ''
          )}
          style={{ width: isLeftPanelCollapsed ? 0 : leftPanelWidth }}
        >
          {!isLeftPanelCollapsed && <SemanticPanel />}
        </div>

        {/* Left Panel Toggle */}
        <button
          onClick={toggleLeftPanel}
          className="flex-shrink-0 w-6 flex items-center justify-center bg-dark-800 border-r border-dark-700 hover:bg-dark-700 transition-colors group"
        >
          {isLeftPanelCollapsed ? (
            <ChevronRight className="w-4 h-4 text-dark-400 group-hover:text-white" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-dark-400 group-hover:text-white" />
          )}
        </button>

        {/* Center - Video Preview */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <VideoPreview />
        </div>

        {/* Right Panel Toggle */}
        <button
          onClick={toggleRightPanel}
          className="flex-shrink-0 w-6 flex items-center justify-center bg-dark-800 border-l border-dark-700 hover:bg-dark-700 transition-colors group"
        >
          {isRightPanelCollapsed ? (
            <ChevronLeft className="w-4 h-4 text-dark-400 group-hover:text-white" />
          ) : (
            <ChevronRight className="w-4 h-4 text-dark-400 group-hover:text-white" />
          )}
        </button>

        {/* Right Panel - AI Director */}
        <div
          className={cn(
            'flex-shrink-0 border-l border-dark-700 bg-dark-800 transition-all duration-300 overflow-hidden',
            isRightPanelCollapsed ? 'w-0' : ''
          )}
          style={{ width: isRightPanelCollapsed ? 0 : rightPanelWidth }}
        >
          {!isRightPanelCollapsed && <AIDirectorPanel />}
        </div>
      </div>

      {/* Timeline Resize Handle */}
      <div
        onMouseDown={() => setIsResizingTimeline(true)}
        className={cn(
          "h-1.5 bg-dark-700 hover:bg-accent-primary cursor-row-resize flex items-center justify-center group transition-colors",
          isResizingTimeline && "bg-accent-primary"
        )}
      >
        <GripVertical className="w-4 h-4 text-dark-500 group-hover:text-white rotate-90" />
      </div>

      {/* Bottom - Timeline */}
      <div
        className="flex-shrink-0 bg-dark-800 border-t border-dark-700"
        style={{ height: timelineHeight }}
      >
        <Timeline />
      </div>

      {/* Export Modal */}
      {showExportModal && <ExportModal />}
    </div>
  )
}
