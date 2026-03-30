import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getTeam, addMember } from '../api/teams.js'
import { listProjects, createProject } from '../api/projects.js'

export default function TeamPage() {
  const { teamId } = useParams()
  const navigate = useNavigate()
  const [team, setTeam] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('projects')
  const [error, setError] = useState('')

  // Project creation
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [projectForm, setProjectForm] = useState({ name: '', description: '' })
  const [creatingProject, setCreatingProject] = useState(false)

  // Add member
  const [memberEmail, setMemberEmail] = useState('')
  const [addingMember, setAddingMember] = useState(false)
  const [memberError, setMemberError] = useState('')
  const [memberSuccess, setMemberSuccess] = useState('')

  useEffect(() => {
    loadData()
  }, [teamId])

  async function loadData() {
    try {
      const [teamData, projectsData] = await Promise.all([
        getTeam(parseInt(teamId)),
        listProjects(parseInt(teamId)),
      ])
      setTeam(teamData)
      setProjects(projectsData)
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) {
        navigate('/')
      } else {
        setError('Failed to load team data')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateProject(e) {
    e.preventDefault()
    if (!projectForm.name.trim()) return
    setCreatingProject(true)
    try {
      const project = await createProject({
        name: projectForm.name.trim(),
        description: projectForm.description.trim() || null,
        team_id: parseInt(teamId),
      })
      setProjects((prev) => [...prev, project])
      setProjectForm({ name: '', description: '' })
      setShowCreateProject(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create project')
    } finally {
      setCreatingProject(false)
    }
  }

  async function handleAddMember(e) {
    e.preventDefault()
    if (!memberEmail.trim()) return
    setAddingMember(true)
    setMemberError('')
    setMemberSuccess('')
    try {
      const newMember = await addMember(parseInt(teamId), { email: memberEmail.trim() })
      setTeam((prev) => ({ ...prev, members: [...prev.members, newMember] }))
      setMemberEmail('')
      setMemberSuccess(`${newMember.full_name} added to team`)
    } catch (err) {
      setMemberError(err.response?.data?.detail || 'Failed to add member')
    } finally {
      setAddingMember(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  if (!team) return null

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{team.name}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {projects.length} {projects.length === 1 ? 'project' : 'projects'} •{' '}
          {team.members.length} {team.members.length === 1 ? 'member' : 'members'}
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {['projects', 'sprints', 'members'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'projects' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowCreateProject(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </button>
          </div>

          {showCreateProject && (
            <div className="mb-4 bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Create New Project</h3>
              <form onSubmit={handleCreateProject} className="space-y-3">
                <input
                  type="text"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Project name"
                  autoFocus
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={projectForm.description}
                  onChange={(e) => setProjectForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Description (optional)"
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={creatingProject}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creatingProject ? 'Creating...' : 'Create Project'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCreateProject(false); setProjectForm({ name: '', description: '' }) }}
                    className="border border-slate-300 text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {projects.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-500 text-sm">No projects yet. Create your first project.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-5 py-4 hover:border-blue-300 hover:shadow-sm transition-all group"
                >
                  <div>
                    <div className="font-medium text-slate-800">{project.name}</div>
                    {project.description && (
                      <div className="text-sm text-slate-500 mt-0.5">{project.description}</div>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'sprints' && (
        <div className="text-center py-8">
          <Link
            to={`/teams/${teamId}/sprints`}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            View All Sprints
          </Link>
        </div>
      )}

      {activeTab === 'members' && (
        <div>
          <div className="mb-4 bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Add Member by Email</h3>
            {memberError && (
              <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                {memberError}
              </div>
            )}
            {memberSuccess && (
              <div className="mb-3 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-sm">
                {memberSuccess}
              </div>
            )}
            <form onSubmit={handleAddMember} className="flex gap-3">
              <input
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="member@example.com"
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={addingMember}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {addingMember ? 'Adding...' : 'Add'}
              </button>
            </form>
          </div>

          <div className="space-y-2">
            {team.members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-5 py-3">
                <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {member.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800">{member.full_name}</div>
                  <div className="text-sm text-slate-500">{member.email}</div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  member.role === 'owner'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
