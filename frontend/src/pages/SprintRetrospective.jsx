import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getSprint } from '../api/sprints.js'
import { getTeam } from '../api/teams.js'
import { listTasks } from '../api/tasks.js'
import { getRetrospective, saveRetrospective } from '../api/sprints.js'

const statusConfig = {
  todo: { label: 'To Do', classes: 'bg-gray-100 text-gray-600' },
  in_progress: { label: 'In Progress', classes: 'bg-blue-100 text-blue-700' },
  testing: { label: 'Testing', classes: 'bg-violet-100 text-violet-700' },
  ready_for_production: { label: 'Ready for Prod', classes: 'bg-amber-100 text-amber-700' },
  done: { label: 'Done', classes: 'bg-green-100 text-green-700' },
}

const sections = [
  {
    key: 'went_well',
    label: 'What went well',
    placeholder: 'Things that worked well during this sprint...',
    color: 'border-green-300 focus:ring-green-400',
    headerColor: 'text-green-700',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'improvements',
    label: 'What could be improved',
    placeholder: 'Things that could have gone better...',
    color: 'border-amber-300 focus:ring-amber-400',
    headerColor: 'text-amber-700',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
  },
  {
    key: 'action_items',
    label: 'Action items',
    placeholder: 'Concrete steps to take in the next sprint...',
    color: 'border-blue-300 focus:ring-blue-400',
    headerColor: 'text-blue-700',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
]

export default function SprintRetrospective() {
  const { sprintId } = useParams()
  const [sprint, setSprint] = useState(null)
  const [team, setTeam] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ went_well: '', improvements: '', action_items: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadData()
  }, [sprintId])

  async function loadData() {
    try {
      const sprintData = await getSprint(parseInt(sprintId))
      setSprint(sprintData)

      const [teamData, tasksData, retro] = await Promise.all([
        getTeam(sprintData.team_id),
        listTasks({ sprint_id: parseInt(sprintId) }),
        getRetrospective(parseInt(sprintId)),
      ])
      setTeam(teamData)
      setTasks(tasksData)
      if (retro) {
        setForm({
          went_well: retro.went_well || '',
          improvements: retro.improvements || '',
          action_items: retro.action_items || '',
        })
      }
    } catch {
      setError('Failed to load retrospective')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await saveRetrospective(parseInt(sprintId), {
        went_well: form.went_well || null,
        improvements: form.improvements || null,
        action_items: form.action_items || null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save retrospective')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  if (!sprint) return null

  const total = tasks.length
  const done = tasks.filter((t) => t.status === 'done').length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  // Group remaining (non-done) tasks by status
  const remaining = tasks.filter((t) => t.status !== 'done')
  const byStatus = {}
  for (const t of remaining) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb + header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          {team && (
            <>
              <Link to={`/teams/${sprint.team_id}`} className="hover:text-blue-600">{team.name}</Link>
              <span>/</span>
              <Link to={`/teams/${sprint.team_id}/sprints`} className="hover:text-blue-600">Sprints</Link>
              <span>/</span>
              <Link to={`/sprints/${sprintId}`} className="hover:text-blue-600">{sprint.name}</Link>
              <span>/</span>
            </>
          )}
          <span>Retrospective</span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{sprint.name} — Retrospective</h1>
            {(sprint.start_date || sprint.end_date) && (
              <p className="text-sm text-slate-500 mt-1">
                {sprint.start_date
                  ? new Date(sprint.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '?'}
                {' — '}
                {sprint.end_date
                  ? new Date(sprint.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '?'}
              </p>
            )}
          </div>
          <Link
            to={`/sprints/${sprintId}`}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            ← Back to board
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Sprint summary stats */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">Sprint Summary</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-800">{total}</div>
            <div className="text-xs text-slate-500 mt-1">Total tasks</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{done}</div>
            <div className="text-xs text-slate-500 mt-1">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-amber-500">{remaining.length}</div>
            <div className="text-xs text-slate-500 mt-1">Incomplete</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Completion</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Remaining breakdown */}
        {remaining.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Incomplete by status:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(byStatus).map(([s, count]) => {
                const cfg = statusConfig[s]
                return (
                  <span key={s} className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg?.classes || 'bg-gray-100 text-gray-600'}`}>
                    {cfg?.label || s}: {count}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {sprint.goal && (
          <p className="mt-3 text-sm text-slate-500 italic border-t border-slate-100 pt-3">
            Goal: "{sprint.goal}"
          </p>
        )}
      </div>

      {/* Retrospective sections */}
      <div className="space-y-4 mb-6">
        {sections.map((section) => (
          <div key={section.key} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className={`flex items-center gap-2 mb-3 ${section.headerColor}`}>
              {section.icon}
              <h3 className="font-semibold">{section.label}</h3>
            </div>
            <textarea
              value={form[section.key]}
              onChange={(e) => setForm((prev) => ({ ...prev, [section.key]: e.target.value }))}
              placeholder={section.placeholder}
              rows={4}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none text-slate-700 placeholder-slate-300 ${section.color}`}
            />
          </div>
        ))}
      </div>

      {/* Save button */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="text-sm text-green-600 font-medium">Saved!</span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Retrospective'}
        </button>
      </div>
    </div>
  )
}
