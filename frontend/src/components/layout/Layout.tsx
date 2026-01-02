import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { useEffect } from 'react'
import { 
  useProjectStore, 
  useMediaStore, 
  useTimelineStore, 
  useAIDirectorStore 
} from '../../store'

export function Layout() {
  const loadProjectData = useProjectStore((state) => state.loadMockData)
  const loadMediaData = useMediaStore((state) => state.loadMockData)
  const loadTimelineData = useTimelineStore((state) => state.loadMockData)
  const loadAIData = useAIDirectorStore((state) => state.loadMockData)

  useEffect(() => {
    // Load mock data on initial mount
    loadProjectData()
    loadMediaData()
    loadTimelineData()
    loadAIData()
  }, [loadProjectData, loadMediaData, loadTimelineData, loadAIData])

  return (
    <div className="h-screen flex flex-col bg-dark-900 overflow-hidden">
      <Header />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
