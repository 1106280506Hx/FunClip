import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, 
  Clock, 
  Film, 
  MoreVertical,
  Play,
  Trash2,
  Edit3,
  Loader2
} from 'lucide-react'
import { cn, formatRelativeTime } from '../utils/helpers'
import { useProjectStore } from '../store'
import type { Project } from '../types'

export function Dashboard() {
  const [isCreating, setIsCreating] = useState(false)
  const projects = useProjectStore((state) => state.projects)
  const fetchProjects = useProjectStore((state) => state.fetchProjects)
  const deleteProject = useProjectStore((state) => state.deleteProject)
  const updateProject = useProjectStore((state) => state.updateProject)
  const createProject = useProjectStore((state) => state.createProject)
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject)
  const navigate = useNavigate()

  // 初始化时从后端加载项目列表
  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleCreateProject = async () => {
    if (isCreating) return
    setIsCreating(true)
    try {
      const project = await createProject('新建项目')
      setCurrentProject(project)
      navigate(`/editor/${project.id}`)
    } catch (err) {
      console.error('Failed to create project:', err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleOpenProject = (project: Project) => {
    setCurrentProject(project)
    navigate(`/editor/${project.id}`)
  }

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId)
    } catch (err) {
      console.error('Failed to delete project:', err)
    }
  }

  const handleRenameProject = async (projectId: string, newName: string) => {
    try {
      await updateProject(projectId, { name: newName })
    } catch (err) {
      console.error('Failed to rename project:', err)
    }
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">工作台</h1>
          <p className="text-dark-400">AI 智能视频剪辑，让创作更简单</p>
        </div>
        <button 
          onClick={handleCreateProject} 
          disabled={isCreating}
          className="btn btn-primary disabled:opacity-50"
        >
          {isCreating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Plus className="w-5 h-5" />
          )}
          {isCreating ? '创建中...' : '新建项目'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-dark-700 mb-6">
        <TabButton 
          active={true} 
          onClick={() => {}}
          icon={<Film className="w-4 h-4" />}
          label="我的项目"
          count={projects.length}
        />
      </div>

      {/* Content */}
      <ProjectGrid 
        projects={projects} 
        onOpenProject={handleOpenProject}
        onDeleteProject={handleDeleteProject}
        onRenameProject={handleRenameProject}
      />
    </div>
  )
}

// Tab Button
interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count: number
}

function TabButton({ active, onClick, icon, label, count }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 pb-3 border-b-2 transition-colors',
        active
          ? 'border-accent-primary text-white'
          : 'border-transparent text-dark-400 hover:text-dark-200'
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
      <span className={cn(
        'px-2 py-0.5 rounded-full text-xs',
        active ? 'bg-accent-primary/20 text-accent-primary' : 'bg-dark-700 text-dark-400'
      )}>
        {count}
      </span>
    </button>
  )
}

// Project Grid
interface ProjectGridProps {
  projects: Project[]
  onOpenProject: (project: Project) => void
  onDeleteProject: (projectId: string) => Promise<void>
  onRenameProject: (projectId: string, newName: string) => Promise<void>
}

function ProjectGrid({ projects, onOpenProject, onDeleteProject, onRenameProject }: ProjectGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {projects.map((project) => (
        <ProjectCard 
          key={project.id} 
          project={project} 
          onClick={() => onOpenProject(project)}
          onDelete={async () => { await onDeleteProject(project.id) }}
          onRename={async (newName) => { await onRenameProject(project.id, newName) }}
        />
      ))}
    </div>
  )
}

// Project Card
interface ProjectCardProps {
  project: Project
  onClick: () => void
  onDelete: () => Promise<void> | void
  onRename: (newName: string) => void
}

function ProjectCard({ project, onClick, onDelete, onRename }: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(project.name)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleRename = () => {
    setShowMenu(false)
    setIsEditing(true)
    setEditName(project.name)
  }

  const handleSaveRename = async () => {
    if (editName.trim() && editName !== project.name) {
      onRename(editName.trim())
    }
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (isDeleting) return
    setIsDeleting(true)
    setShowMenu(false)
    try {
      await Promise.resolve(onDelete())
      // 删除成功后组件会被移除，不需要重置状态
    } catch (err) {
      console.error('Failed to delete:', err)
      setIsDeleting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditName(project.name)
    }
  }

  return (
    <div 
      className={cn(
        "card card-hover group cursor-pointer",
        isDeleting && "opacity-50 pointer-events-none"
      )}
      onClick={isEditing ? undefined : onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-dark-700 overflow-hidden">
        {project.thumbnail ? (
          <img 
            src={project.thumbnail} 
            alt={project.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-12 h-12 text-dark-500" />
          </div>
        )}
        
        {/* Play button overlay */}
        {!isEditing && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <Play className="w-6 h-6 text-white fill-white ml-1" />
            </div>
          </div>
        )}

        {/* Menu button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 z-10"
        >
          <MoreVertical className="w-4 h-4 text-white" />
        </button>

        {/* Dropdown menu */}
        {showMenu && (
          <div className="dropdown-menu absolute top-10 right-2 z-20" onClick={(e) => e.stopPropagation()}>
            <button className="dropdown-item" onClick={handleRename}>
              <Edit3 className="w-4 h-4" />
              重命名
            </button>
            <button className="dropdown-item text-accent-error" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
              删除
            </button>
          </div>
        )}

        {/* Deleting overlay */}
        {isDeleting && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveRename}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            className="w-full px-2 py-1 bg-dark-700 border border-accent-primary rounded text-white text-sm focus:outline-none"
          />
        ) : (
          <h3 className="font-medium text-white mb-1 truncate">{project.name}</h3>
        )}
        <div className="flex items-center gap-3 text-xs text-dark-400 mt-1">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(project.updatedAt)}
          </span>
          <span>{project.videos.length} 个素材</span>
        </div>
      </div>
    </div>
  )
}
