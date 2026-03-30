import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getTeam } from '../api/teams.js'
import { listSprints, createSprint, startSprint, completeSprint, deleteSprint } from '../api/sprints.js'

const sprintStatusConfig = {
  planned: { label: 'Planned', classes: 'bg-gray-100 text-gray-600' },
  active: { label: 'Active', classes: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', classes: 'bg-green-100 text-green-700' },
}

export default function SprintList() {
  const { teamId } = useParams()
  const [team, setTeam] = useState(null)
  const [sprints, setSprints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [sprintForm, setSprintForm] = useState({
    name: '',
    goal: '',
    start_date: '',
    end_date: '',
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadData()
  }, [teamId])

  async function loadData() {
    try {
      const [teamData, sprintsData] = await Promise.all([
        getTeam(parseInt(teamId)),
        listSprints(parseInt(teamId)),
      ])
      setTeam(teamData)
      setSprints(sprintsData)
    } catch (err) {
      setError('Failed to load sprint data')
    } finally {
      setLoading(false)
    }
  }

  const hasActiveSprint = sprints.some((s) => s.status === 'active')

  async function handleCreateSprint(e) {
    e.preventDefault()
    if (!sprintForm.name.trim()) return
    setCreating(true)
    try {
      const sprint = await createSprint({
        name: sprintForm.name.trim(),
        goal: sprintForm.goal.trim() || null,
        start_date: sprintForm.start_date || null,
        end_date: sprintForm.end_date || null,
        team_id: parseInt(teamId),
      })
      setSprints((prev) => [...prev, sprint])
      setSprintForm({ name: '', goal: '', start_date: '', end_date: '' })
      setShowCreateForm(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create sprint')
    } finally {
      setCreating(false)
    }
  }

  async function handleStartSprint(sprintId) {
    try {
      const updated = await startSprint(sprintId)
      setSprints((prev) => prev.map((s) => (s.id === sprintId ? updated : s)))
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start sprint')
    }
  }

  async function handleCompleteSprint(sprintId) {
    try {
      const updated = await completeSprint(sprintId)
      setSprints((prev) => prev.map((s) => (s.id === sprintId ? updated : s)))
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to complete sprint')
    }
  }

  async function handleDeleteSprint(sprintId) {
    if (!window.confirm('Are you sure you want to delete this sprint?')) return
    try {
      await deleteSprint(sprintId)
      setSprints((prev) => prev.filter((s) => s.id !== sprintId))
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete sprint')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link to={`/teams/${teamId}`} className="hover:text-blue-600">{team?.name}</Link>
            <span>/</span>
            <span>Sprints</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Sprints</h1>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Sprint
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {showCreateForm && (
        <div className="mb-6 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Create New Sprint</h3>
          <form onSubmit={handleCreateSprint} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sprint Name *</label>
              <input
                type="text"
                value={sprintForm.name}
                onChange={(e) => setSprintForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Sprint 1"
                required
                autoFocus
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Goal</label>
              <input
                type="text"
                value={sprintForm.goal}
                onChange={(e) => setSprintForm((p) => ({ ...p, goal: e.target.value }))}
                placeholder="Sprint goal (optional)"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={sprintForm.start_date}
                  onChange={(e) => setSprintForm((p) => ({ ...p, start_date: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={sprintForm.end_date}
                  onChange={(e) => setSprintForm((p) => ({ ...p, end_date: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={creating}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Sprint'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreateForm(false); setSprintForm({ name: '', goal: '', start_date: '', end_date: '' }) }}
                className="border border-slate-300 text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {sprints.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p className="text-slate-500 text-sm">No sprints yet. Create your first sprint to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sprints.map((sprint) => {
            const statusCfg = sprintStatusConfig[sprint.status] || sprintStatusConfig.planned
            return (
              <div key={sprint.id} className="bg-white rounded-xl border border-slate-200 px-5 py-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-800">{sprint.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.classes}`}>
                          {statusCfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        {(sprint.start_date || sprint.end_date) && (
                          <span>
                            {sprint.start_date
                              ? new Date(sprint.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : '?'}
                            {' — '}
                            {sprint.end_date
                              ? new Date(sprint.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : '?'}
                          </span>
                        )}
                        <span>{sprint.task_count} task{sprint.task_count !== 1 ? 's' : ''}</span>
                        {sprint.goal && <span className="italic text-slate-400">"{sprint.goal}"</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/sprints/${sprint.id}`}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      View Board
                    </Link>

                    {sprint.status === 'planned' && (
                      <button
                        onClick={() => handleStartSprint(sprint.id)}
                        disabled={hasActiveSprint}
                        title={hasActiveSprint ? 'Another sprint is already active' : undefined}
                        className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Start Sprint
                      </button>
                    )}

                    {sprint.status === 'active' && (
                      <button
                        onClick={() => handleCompleteSprint(sprint.id)}
                        className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Complete Sprint
                      </button>
                    )}

                    {sprint.status !== 'active' && (
                      <button
                        onClick={() => handleDeleteSprint(sprint.id)}
                        className="text-sm text-red-400 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
