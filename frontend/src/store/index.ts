// ==========================================
/**
 * Zustand Store for VibeClip Application State
 */
// ==========================================

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import {
  Project,
  VideoFile,
  TimelineTrack,
  EmotionConfig,
  StyleConfig,
  BeatMarker,
  Subtitle,
  SemanticTag,
  KeyFrame,
  UIState,
  ViewMode,
  Resolution,
  ExportConfig,
  QualityReport,
} from '../types'
import {
  mockProjects,
  mockVideos,
  mockEmotions,
  mockStyles,
  mockTags,
  mockQualityReport,
  createTimelineTracks,
} from '../data/mockData'

// ==========================================
// Project Store
// ==========================================
interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  isLoading: boolean
  error: string | null

  // Actions
  setProjects: (projects: Project[]) => void
  setCurrentProject: (project: Project | null) => void
  createProject: (name: string) => Promise<Project>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  fetchProjects: () => Promise<void>
  loadMockData: () => void
}

// 生成唯一ID
const generateId = () => `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export const useProjectStore = create<ProjectState>()(
  devtools(
    (set) => ({
      projects: [],
      currentProject: null,
      isLoading: false,
      error: null,

      setProjects: (projects) => set({ projects }),

      setCurrentProject: (project) => set({ currentProject: project }),

      fetchProjects: async () => {
        set({ isLoading: true, error: null })
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 300))
        // 使用 mock 数据
        set({ projects: [...mockProjects], isLoading: false })
      },

      createProject: async (name) => {
        set({ isLoading: true, error: null })
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 300))

        const newProject: Project = {
          id: generateId(),
          name,
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

        set((state) => ({
          projects: [...state.projects, newProject],
          currentProject: newProject,
          isLoading: false,
        }))
        return newProject
      },

      updateProject: async (id, updates) => {
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 100))

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
          ),
          currentProject:
            state.currentProject?.id === id
              ? { ...state.currentProject, ...updates, updatedAt: new Date() }
              : state.currentProject,
        }))
      },

      deleteProject: async (id) => {
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 100))

        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProject:
            state.currentProject?.id === id ? null : state.currentProject,
        }))
      },

      loadMockData: () => {
        // 直接加载 mock 数据
        set({ projects: [...mockProjects] })
      },
    }),
    { name: 'project-store' }
  )
)

// ==========================================
// Media Store
// ==========================================
interface MediaState {
  videos: VideoFile[]
  tags: SemanticTag[]
  keyFrames: KeyFrame[]
  uploadingFiles: string[]

  // Actions
  addVideo: (video: VideoFile) => void
  removeVideo: (id: string) => void
  updateVideoStatus: (id: string, status: VideoFile['status']) => void
  clearVideos: () => void
  setTags: (tags: SemanticTag[]) => void
  setKeyFrames: (keyFrames: KeyFrame[]) => void
  toggleKeyFrameSelection: (id: string) => void
  selectAllKeyFrames: (selected: boolean) => void
  loadMockData: () => void
}

export const useMediaStore = create<MediaState>()(
  devtools(
    (set) => ({
      videos: [],
      tags: [],
      keyFrames: [],
      uploadingFiles: [],

      addVideo: (video) =>
        set((state) => {
          const existingIndex = state.videos.findIndex((v) => v.id === video.id)
          if (existingIndex !== -1) {
            // 更新已存在的视频
            const newVideos = [...state.videos]
            newVideos[existingIndex] = video
            return { videos: newVideos }
          }
          // 添加新视频
          return { videos: [...state.videos, video] }
        }),

      removeVideo: (id) =>
        set((state) => ({ videos: state.videos.filter((v) => v.id !== id) })),

      updateVideoStatus: (id, status) =>
        set((state) => ({
          videos: state.videos.map((v) =>
            v.id === id ? { ...v, status } : v
          ),
        })),

      clearVideos: () => set({ videos: [] }),

      setTags: (tags) => set({ tags }),

      setKeyFrames: (keyFrames) => set({ keyFrames }),

      toggleKeyFrameSelection: (id) =>
        set((state) => ({
          keyFrames: state.keyFrames.map((kf) =>
            kf.id === id ? { ...kf, isSelected: !kf.isSelected } : kf
          ),
        })),

      selectAllKeyFrames: (selected) =>
        set((state) => ({
          keyFrames: state.keyFrames.map((kf) => ({ ...kf, isSelected: selected })),
        })),

      loadMockData: () => {
        set({
          videos: [...mockVideos],
          tags: [...mockTags],
          keyFrames: [], // 初始为空，等待用户点击“提取”
        })
      },
    }),
    { name: 'media-store' }
  )
)

// ==========================================
// Timeline Store
// ==========================================
interface TimelineState {
  tracks: TimelineTrack[]
  beatMarkers: BeatMarker[]
  subtitles: Subtitle[]
  currentTime: number
  duration: number
  isPlaying: boolean
  zoom: number

  // Actions
  setTracks: (tracks: TimelineTrack[]) => void
  setBeatMarkers: (markers: BeatMarker[]) => void
  setSubtitles: (subtitles: Subtitle[]) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setIsPlaying: (isPlaying: boolean) => void
  setZoom: (zoom: number) => void
  toggleTrackMute: (trackId: string) => void
  toggleTrackLock: (trackId: string) => void
  updateSubtitle: (id: string, text: string) => void
  removeClipFromTrack: (trackId: string, clipId: string) => void
  loadMockData: () => void
}

export const useTimelineStore = create<TimelineState>()(
  devtools(
    (set) => ({
      tracks: [],
      beatMarkers: [],
      subtitles: [],
      currentTime: 0,
      duration: 0,  // 初始为0，根据添加的片段自动计算
      isPlaying: false,
      zoom: 1,

      setTracks: (tracks) => set({ tracks }),

      setBeatMarkers: (beatMarkers) => set({ beatMarkers }),

      setSubtitles: (subtitles) => set({ subtitles }),

      setCurrentTime: (currentTime) => set({ currentTime }),

      setDuration: (duration) => set({ duration }),

      setIsPlaying: (isPlaying) => set({ isPlaying }),

      setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),

      toggleTrackMute: (trackId) =>
        set((state) => ({
          tracks: state.tracks.map((t) =>
            t.id === trackId ? { ...t, isMuted: !t.isMuted } : t
          ),
        })),

      toggleTrackLock: (trackId) =>
        set((state) => ({
          tracks: state.tracks.map((t) =>
            t.id === trackId ? { ...t, isLocked: !t.isLocked } : t
          ),
        })),

      updateSubtitle: (id, text) =>
        set((state) => ({
          subtitles: state.subtitles.map((s) =>
            s.id === id ? { ...s, text } : s
          ),
        })),

      removeClipFromTrack: (trackId, clipId) =>
        set((state) => {
          // 先删除片段
          const tracksWithRemovedClip = state.tracks.map((track) =>
            track.id === trackId
              ? { ...track, clips: track.clips.filter((c) => c.id !== clipId) }
              : track
          )

          // 过滤空轨道，但保留至少一个视频轨道和至少一个音频轨道
          const videoTracks = tracksWithRemovedClip.filter(t => t.type === 'video')
          const audioTracks = tracksWithRemovedClip.filter(t => t.type === 'audio')

          const firstVideoTrackId = videoTracks[0]?.id
          const firstAudioTrackId = audioTracks[0]?.id

          const newTracks = tracksWithRemovedClip.filter((track) =>
            track.clips.length > 0 ||
            track.id === firstVideoTrackId ||
            track.id === firstAudioTrackId
          )

          // 重新计算总时长
          let maxEndTime = 0
          newTracks.forEach((track) => {
            track.clips.forEach((clip) => {
              if (clip.endTime > maxEndTime) maxEndTime = clip.endTime
            })
          })

          return {
            tracks: newTracks,
            duration: maxEndTime,
          }
        }),

      loadMockData: () => {
        // 初始化为空状态，等待用户上传和添加素材
        set({
          tracks: createTimelineTracks(0),
          beatMarkers: [],   // 不加载 mock beat markers
          subtitles: [],     // 不加载 mock 字幕
          duration: 0,       // 初始时长为0
        })
      },
    }),
    { name: 'timeline-store' }
  )
)

// ==========================================
// AI Director Store
// ==========================================
interface AIDirectorState {
  selectedEmotion: EmotionConfig | null
  selectedStyle: StyleConfig | null
  selectedMusicPath: string | null
  availableEmotions: EmotionConfig[]
  availableStyles: StyleConfig[]
  promptHistory: { role: 'user' | 'assistant'; content: string }[]
  isProcessing: boolean
  generatedVideoUrl: string | null

  // Actions
  setSelectedEmotion: (emotion: EmotionConfig | null) => void
  setSelectedStyle: (style: StyleConfig | null) => void
  setSelectedMusicPath: (path: string | null) => void
  addPrompt: (prompt: string) => void
  addResponse: (response: string) => void
  setIsProcessing: (isProcessing: boolean) => void
  setGeneratedVideoUrl: (url: string | null) => void
  clearHistory: () => void
  loadMockData: () => void
}

export const useAIDirectorStore = create<AIDirectorState>()(
  devtools(
    (set) => ({
      selectedEmotion: null,
      selectedStyle: null,
      selectedMusicPath: null,
      availableEmotions: mockEmotions,
      availableStyles: mockStyles,
      promptHistory: [],
      isProcessing: false,
      generatedVideoUrl: null,

      setSelectedEmotion: (emotion) => set({ selectedEmotion: emotion }),

      setSelectedStyle: (style) => set({ selectedStyle: style }),

      setSelectedMusicPath: (path) => set({ selectedMusicPath: path }),

      addPrompt: (prompt) =>
        set((state) => ({
          promptHistory: [
            ...state.promptHistory,
            { role: 'user', content: prompt },
          ],
        })),

      addResponse: (response) =>
        set((state) => ({
          promptHistory: [
            ...state.promptHistory,
            { role: 'assistant', content: response },
          ],
        })),

      setIsProcessing: (isProcessing) => set({ isProcessing }),

      setGeneratedVideoUrl: (url) => set({ generatedVideoUrl: url }),

      clearHistory: () => set({ promptHistory: [] }),

      loadMockData: () => {
        set({
          selectedEmotion: mockEmotions[0],
          selectedStyle: mockStyles[0],
          availableEmotions: mockEmotions,
          availableStyles: mockStyles,
        })
      },
    }),
    { name: 'ai-director-store' }
  )
)

// ==========================================
// Export Store
// ==========================================
interface ExportState {
  config: ExportConfig
  isExporting: boolean
  progress: number
  qualityReport: QualityReport | null
  showExportModal: boolean

  // Actions
  setConfig: (config: Partial<ExportConfig>) => void
  setIsExporting: (isExporting: boolean) => void
  setProgress: (progress: number) => void
  setQualityReport: (report: QualityReport | null) => void
  setShowExportModal: (show: boolean) => void
  resetExport: () => void
}

const defaultExportConfig: ExportConfig = {
  format: 'mp4',
  resolution: '1080p',
  quality: 'high',
  platforms: ['bilibili'],
  includeSubtitles: true,
}

export const useExportStore = create<ExportState>()(
  devtools(
    (set) => ({
      config: defaultExportConfig,
      isExporting: false,
      progress: 0,
      qualityReport: null,
      showExportModal: false,

      setConfig: (config) =>
        set((state) => ({ config: { ...state.config, ...config } })),

      setIsExporting: (isExporting) => set({ isExporting }),

      setProgress: (progress) => set({ progress }),

      setQualityReport: (qualityReport) => set({ qualityReport }),

      setShowExportModal: (showExportModal) => set({ showExportModal }),

      resetExport: () =>
        set({
          isExporting: false,
          progress: 0,
          qualityReport: mockQualityReport,
        }),
    }),
    { name: 'export-store' }
  )
)

// ==========================================
// UI Store
// ==========================================
interface UIStoreState extends UIState {
  // Actions
  setLeftPanelWidth: (width: number) => void
  setRightPanelWidth: (width: number) => void
  setTimelineHeight: (height: number) => void
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  setPreviewQuality: (quality: Resolution) => void
  setCurrentView: (view: ViewMode) => void
}

export const useUIStore = create<UIStoreState>()(
  devtools(
    persist(
      (set) => ({
        leftPanelWidth: 280,
        rightPanelWidth: 320,
        timelineHeight: 200,
        isLeftPanelCollapsed: false,
        isRightPanelCollapsed: false,
        previewQuality: '720p',
        currentView: 'dashboard',

        setLeftPanelWidth: (width) =>
          set({ leftPanelWidth: Math.max(200, Math.min(400, width)) }),

        setRightPanelWidth: (width) =>
          set({ rightPanelWidth: Math.max(250, Math.min(450, width)) }),

        setTimelineHeight: (height) =>
          set({ timelineHeight: Math.max(150, Math.min(400, height)) }),

        toggleLeftPanel: () =>
          set((state) => ({
            isLeftPanelCollapsed: !state.isLeftPanelCollapsed,
          })),

        toggleRightPanel: () =>
          set((state) => ({
            isRightPanelCollapsed: !state.isRightPanelCollapsed,
          })),

        setPreviewQuality: (quality) => set({ previewQuality: quality }),

        setCurrentView: (view) => set({ currentView: view }),
      }),
      { name: 'ui-store' }
    ),
    { name: 'ui-store' }
  )
)

// ==========================================
// Search Store
// ==========================================
interface SearchState {
  searchQuery: string
  searchResults: KeyFrame[]
  isSearching: boolean

  // Actions
  setSearchQuery: (query: string) => void
  setSearchResults: (results: KeyFrame[]) => void
  setIsSearching: (isSearching: boolean) => void
  performSearch: (query: string) => void
}

export const useSearchStore = create<SearchState>()(
  devtools(
    (set) => ({
      searchQuery: '',
      searchResults: [],
      isSearching: false,

      setSearchQuery: (query) => {
        set({ searchQuery: query })
        if (!query.trim()) {
          set({ searchResults: [] })
        }
      },

      setSearchResults: (results) => set({ searchResults: results }),

      setIsSearching: (isSearching) => set({ isSearching }),

      performSearch: (query) => {
        set({ isSearching: true, searchQuery: query })

        // 模拟搜索延迟
        setTimeout(() => {
          const allKeyFrames = useMediaStore.getState().keyFrames
          const allVideos = useMediaStore.getState().videos

          if (!query.trim()) {
            set({ searchResults: [], isSearching: false })
            return
          }

          const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean)

          const results = allKeyFrames.filter((kf) => {
            const video = allVideos.find(v => v.id === kf.videoId)
            const videoName = video?.name.toLowerCase() || ''
            const allTagsString = kf.tags.map(t => t.label).join('').toLowerCase()
            const thumbnailName = kf.thumbnail.toLowerCase()

            // 检查是否匹配所有搜索词（AND 逻辑）
            return searchTerms.every(term => {
              // 1. 搜索标签
              const hasMatchingTag = kf.tags.some((tag) =>
                tag.label.toLowerCase().includes(term) ||
                tag.category.toLowerCase().includes(term)
              )

              // 2. 搜索视频名称或缩略图路径
              const matchesVideoName = videoName.includes(term) || thumbnailName.includes(term)

              // 3. 搜索组合标签（处理中文无空格搜索）
              const matchesCombinedTags = allTagsString.includes(term)

              return hasMatchingTag || matchesVideoName || matchesCombinedTags
            })
          })

          set({ searchResults: results, isSearching: false })
        }, 400)
      },
    }),
    { name: 'search-store' }
  )
)
