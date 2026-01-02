import { Link, useLocation } from 'react-router-dom'
import {
  Clapperboard,
  Home,
  Film,
  Download,
  Settings,
  HelpCircle,
  Sparkles
} from 'lucide-react'
import { cn } from '../../utils/helpers'
import { useExportStore, useProjectStore } from '../../store'

export function Header() {
  const location = useLocation()
  const currentProject = useProjectStore((state) => state.currentProject)
  const setShowExportModal = useExportStore((state) => state.setShowExportModal)

  const isEditor = location.pathname.startsWith('/editor')

  return (
    <header className="h-14 bg-dark-800 border-b border-dark-700 flex items-center px-4 gap-4">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 mr-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
          <Clapperboard className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-lg text-white">VibeClip</span>
        <span className="text-xs px-2 py-0.5 rounded bg-accent-primary/20 text-accent-primary font-medium">
          AI
        </span>
      </Link>

      {/* Navigation */}
      <nav className="flex items-center gap-1">
        <NavLink to="/" icon={<Home className="w-4 h-4" />} label="首页" />
        <NavLink to="/editor" icon={<Film className="w-4 h-4" />} label="编辑器" />
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Project Name (when in editor) */}
      {isEditor && currentProject && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-700 rounded-lg">
          <Sparkles className="w-4 h-4 text-accent-primary" />
          <span className="text-sm text-dark-200">{currentProject.name}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {isEditor && (
          <button
            onClick={() => setShowExportModal(true)}
            className="btn btn-primary text-sm"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
        )}
      </div>
    </header>
  )
}

interface NavLinkProps {
  to: string
  icon: React.ReactNode
  label: string
}

function NavLink({ to, icon, label }: NavLinkProps) {
  const location = useLocation()
  const isActive = to === '/'
    ? location.pathname === '/'
    : location.pathname.startsWith(to)

  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-dark-700 text-white'
          : 'text-dark-400 hover:text-white hover:bg-dark-700/50'
      )}
    >
      {icon}
      {label}
    </Link>
  )
}
