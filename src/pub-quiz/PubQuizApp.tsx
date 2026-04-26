import { Routes, Route, Navigate } from 'react-router-dom'
import CreateSession from './CreateSession'
import HostView from './HostView'
import TeamView from './TeamView'
import DisplayView from './DisplayView'

export default function PubQuizApp() {
  return (
    <Routes>
      <Route path="/create" element={<CreateSession />} />
      <Route path="/host/:sessionCode" element={<HostView />} />
      <Route path="/play/:sessionCode" element={<TeamView />} />
      <Route path="/display/:sessionCode" element={<DisplayView />} />
      <Route path="*" element={<Navigate to="/create" replace />} />
    </Routes>
  )
}
