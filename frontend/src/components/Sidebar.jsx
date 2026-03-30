import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/auth.js'
import { listTeams } from '../api/teams.js'
import { listProjects } from '../api/projects.js'

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [teams, setTeams] = useState([])
  const [projectsByTeam, setProjectsByTeam] = useState({})
  const [expandedTeams, setExpandedTeams] = useState({})

  useEffect(() => {
    loadTeams()
  }, [location.pathname])

  async function loadTeams() {
    try {
      const data = await listTeams()
      setTeams(data)
      for (const team of data) {
        try {
          const projects = await listProjects(team.id)
          setProjectsByTeam((prev) => ({ ...prev, [team.id]: projects }))
          setExpandedTeams((prev) => ({ ...prev, [team.id]: true }))
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function toggleTeam(teamId) {
    setExpandedTeams((prev) => ({ ...prev, [teamId]: !prev[teamId] }))
  }

  const isActive = (path) => location.pathname === path

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen fixed left-0 top-0">
      <div className="p-4 border-b border-slate-700">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white text-sm">
            JL
          </div>
          <span className="font-semibold text-lg">Jira Lite</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <Link
          to="/"
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm mb-1 transition-colors ${
            isActive('/') ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Dashboard
        </Link>

        <div className="mt-4">
          {teams.map((team) => (
            <div key={team.id} className="mb-2">
              <div className="flex items-center justify-between px-3 py-1.5">
                <button
                  onClick={() => toggleTeam(team.id)}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors"
                >
                  <svg
                    className={`w-3 h-3 transition-transform ${expandedTeams[team.id] ? 'rotate-90' : ''}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  {team.name}
                </button>
                <Link
                  to={`/teams/${team.id}`}
                  className="text-slate-400 hover:text-slate-200"
                  title="Team settings"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Link>
              </div>

              {expandedTeams[team.id] && (
                <div className="ml-3 mt-1 space-y-0.5">
                  {(projectsByTeam[team.id] || []).map((project) => (
                    <Link
                      key={project.id}
                      to={`/projects/${project.id}`}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                        isActive(`/projects/${project.id}`)
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="truncate">{project.name}</span>
                    </Link>
                  ))}
                  <Link
                    to={`/teams/${team.id}/sprints`}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                      isActive(`/teams/${team.id}/sprints`)
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Sprints
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{user?.full_name}</div>
            <div className="text-xs text-slate-400 truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left text-sm text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
