import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { Editor } from './pages/Editor'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="editor" element={<Editor />} />
        <Route path="editor/:projectId" element={<Editor />} />
      </Route>
    </Routes>
  )
}

export default App
