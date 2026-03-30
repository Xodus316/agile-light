import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import TeamPage from './pages/TeamPage.jsx'
import ProjectBacklog from './pages/ProjectBacklog.jsx'
import SprintBoard from './pages/SprintBoard.jsx'
import SprintList from './pages/SprintList.jsx'
import SprintRetrospective from './pages/SprintRetrospective.jsx'
import TeamBacklog from './pages/TeamBacklog.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="teams/:teamId" element={<TeamPage />} />
          <Route path="teams/:teamId/sprints" element={<SprintList />} />
          <Route path="teams/:teamId/backlog" element={<TeamBacklog />} />
          <Route path="projects/:projectId" element={<ProjectBacklog />} />
          <Route path="sprints/:sprintId" element={<SprintBoard />} />
          <Route path="sprints/:sprintId/retrospective" element={<SprintRetrospective />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
