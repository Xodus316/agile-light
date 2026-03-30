import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getTeam } from '../api/teams.js'
import { getBacklog } from '../api/tasks.js'
import { listSprints } from '../api/sprints.js'
import { updateTask } from '../api/tasks.js'
import TaskCard from '../components/TaskCard.jsx'
import TaskModal from '../components/TaskModal.jsx'

const priorityOrder = { high: 0, medium: 1, low: 2 }

export default function TeamBacklog() {
  const { teamId } = useParams()
  const [team, setTeam] = useState(null)
  const [backlog, setBacklog] = useState([])
  const [sprints, setSprints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filterAssignee, setFilterAssignee] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [selected, setSelected] = useState(new Set())
  const [targetSprintId, setTargetSprintId] = useState('')
  const [adding, setAdding] = useState(false)

  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)

  useEffect(() => {
    loadData()
  }, [teamId])

  async function loadData() {
    try {
      const [teamData, backlogData, sprintsData] = await Promise.all([
        getTeam(parseInt(teamId)),
        getBacklog(parseInt(teamId)),
        listSprints(parseInt(teamId)),
      ])
      setTeam(teamData)
      setBacklog(backlogData)
      const assignableSprints = sprintsData.filter((s) => s.status !== 'completed')
      setSprints(assignableSprints)
      if (assignableSprints.length > 0) setTargetSprintId(String(assignableSprints[0].id))
    } catch {
      setError('Failed to load backlog')
    } finally {
      setLoading(false)
    }
  }

  function handleTaskSaved(savedTask) {
    setBacklog((prev) =>
      prev.map((group) => {
        if (group.project_id !== savedTask.project_id) return group
        if (savedTask.sprint_id != null) {
          return { ...group, tasks: group.tasks.filter((t) => t.id !== savedTask.id) }
        }
        const exists = group.tasks.find((t) => t.id === savedTask.id)
        if (exists) {
          return { ...group, tasks: group.tasks.map((t) => (t.id === savedTask.id ? savedTask : t)) }
        }
        return { ...group, tasks: [...group.tasks, savedTask] }
      })
    )
  }

  function handleTaskDeleted(taskId) {
    setBacklog((prev) =>
      prev.map((group) => ({ ...group, tasks: group.tasks.filter((t) => t.id !== taskId) }))
    )
    setSelected((prev) => { const s = new Set(prev); s.delete(taskId); return s })
  }

  function filterTask(task) {
    if (filterAssignee && String(task.assignee_id) !== filterAssignee) return false
    if (filterPriority && task.priority !== filterPriority) return false
    if (filterStatus && task.status !== filterStatus) return false
    return true
  }

  function toggleSelect(taskId) {
    setSelected((prev) => {
      const s = new Set(prev)
      s.has(taskId) ? s.delete(taskId) : s.add(taskId)
      return s
    })
  }

  function toggleSelectGroup(taskIds) {
    const allSelected = taskIds.every((id) => selected.has(id))
    setSelected((prev) => {
      const s = new Set(prev)
      if (allSelected) taskIds.forEach((id) => s.delete(id))
      else taskIds.forEach((id) => s.add(id))
      return s
    })
  }

  async function handleAddToSprint() {
    if (!targetSprintId || selected.size === 0) return
    setAdding(true)
    setError('')
    try {
      await Promise.all(
        [...selected].map((taskId) => updateTask(taskId, { sprint_id: parseInt(targetSprintId) }))
      )
      // Remove moved tasks from backlog
      setBacklog((prev) =>
        prev.map((group) => ({ ...group, tasks: group.tasks.filter((t) => !selected.has(t.id)) }))
      )
      setSelected(new Set())
    } catch {
      setError('Failed to add some tasks to sprint')
    } finally {
      setAdding(false)
    }
  }

  const totalCount = backlog.reduce((sum, g) => sum + g.tasks.filter(filterTask).length, 0)
  const hasFilters = filterAssignee || filterPriority || filterStatus

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="pb-24">
      <div className="mb-5">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <Link to={`/teams/${teamId}`} className="hover:text-blue-600">{team?.name}</Link>
          <span>/</span>
          <span>Backlog</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Backlog</h1>
        <p className="text-sm text-slate-500 mt-1">Tasks not assigned to any sprint</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5 bg-white rounded-xl border border-slate-200 px-4 py-3">
        <span className="text-sm font-medium text-slate-600">Filter:</span>

        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Assignees</option>
          {(team?.members || []).map((m) => (
            <option key={m.user_id} value={String(m.user_id)}>{m.full_name}</option>
          ))}
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="testing">Testing</option>
          <option value="ready_for_production">Ready for Production</option>
          <option value="done">Done</option>
        </select>

        {hasFilters && (
          <button
            onClick={() => { setFilterAssignee(''); setFilterPriority(''); setFilterStatus('') }}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Clear filters
          </button>
        )}

        <div className="ml-auto text-sm text-slate-400">
          {totalCount} task{totalCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Backlog grouped by project */}
      <div className="space-y-6">
        {backlog.map((group) => {
          const visibleTasks = group.tasks
            .filter(filterTask)
            .sort((a, b) => (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1))

          const visibleIds = visibleTasks.map((t) => t.id)
          const allGroupSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))
          const someGroupSelected = visibleIds.some((id) => selected.has(id))

          return (
            <div key={group.project_id} className="bg-white rounded-xl border border-slate-200">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
                {visibleIds.length > 0 && (
                  <input
                    type="checkbox"
                    checked={allGroupSelected}
                    ref={(el) => { if (el) el.indeterminate = someGroupSelected && !allGroupSelected }}
                    onChange={() => toggleSelectGroup(visibleIds)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                <Link
                  to={`/projects/${group.project_id}`}
                  className="font-semibold text-slate-700 hover:text-blue-600 transition-colors flex-1"
                >
                  {group.project_name}
                </Link>
                <span className="text-xs text-slate-400">
                  {visibleTasks.length} task{visibleTasks.length !== 1 ? 's' : ''}
                </span>
              </div>

              {visibleTasks.length === 0 ? (
                <div className="px-5 py-6 text-center text-sm text-slate-300">
                  {group.tasks.length === 0 ? 'No backlog tasks' : 'No tasks match filters'}
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {visibleTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 px-4 py-2 transition-colors ${
                        selected.has(task.id) ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(task.id)}
                        onChange={() => toggleSelect(task.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer flex-shrink-0"
                      />
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => { setEditingTask(task); setShowTaskModal(true) }}
                      >
                        <TaskCard task={task} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {backlog.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            No projects found for this team.
          </div>
        )}
      </div>

      {/* Sticky action bar — shown when tasks are selected */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-xl shadow-2xl px-5 py-3 flex items-center gap-4 min-w-max">
          <span className="text-sm font-medium">
            {selected.size} task{selected.size !== 1 ? 's' : ''} selected
          </span>

          <div className="h-4 w-px bg-slate-600" />

          {sprints.length === 0 ? (
            <span className="text-sm text-slate-400">No active or planned sprints</span>
          ) : (
            <>
              <select
                value={targetSprintId}
                onChange={(e) => setTargetSprintId(e.target.value)}
                className="bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {sprints.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name} {s.status === 'active' ? '(Active)' : ''}
                  </option>
                ))}
              </select>

              <button
                onClick={handleAddToSprint}
                disabled={adding}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {adding ? 'Adding...' : 'Add to Sprint'}
              </button>
            </>
          )}

          <button
            onClick={() => setSelected(new Set())}
            className="text-slate-400 hover:text-white transition-colors ml-1"
            title="Clear selection"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {showTaskModal && editingTask && (
        <TaskModal
          task={editingTask}
          projectId={editingTask.project_id}
          members={team?.members || []}
          onClose={() => { setShowTaskModal(false); setEditingTask(null) }}
          onSaved={handleTaskSaved}
          onDeleted={handleTaskDeleted}
        />
      )}
    </div>
  )
}
