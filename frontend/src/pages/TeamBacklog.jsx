import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getTeam } from '../api/teams.js'
import { getBacklog, listTasks } from '../api/tasks.js'
import TaskCard from '../components/TaskCard.jsx'
import TaskModal from '../components/TaskModal.jsx'

const priorityOrder = { high: 0, medium: 1, low: 2 }

export default function TeamBacklog() {
  const { teamId } = useParams()
  const [team, setTeam] = useState(null)
  const [backlog, setBacklog] = useState([]) // [{project_id, project_name, tasks}]
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filterAssignee, setFilterAssignee] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)

  useEffect(() => {
    loadData()
  }, [teamId])

  async function loadData() {
    try {
      const [teamData, backlogData] = await Promise.all([
        getTeam(parseInt(teamId)),
        getBacklog(parseInt(teamId)),
      ])
      setTeam(teamData)
      setBacklog(backlogData)
    } catch (err) {
      setError('Failed to load backlog')
    } finally {
      setLoading(false)
    }
  }

  function handleTaskSaved(savedTask) {
    setBacklog((prev) =>
      prev.map((group) => {
        if (group.project_id !== savedTask.project_id) return group
        // If task now has a sprint, remove from backlog
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
      prev.map((group) => ({
        ...group,
        tasks: group.tasks.filter((t) => t.id !== taskId),
      }))
    )
  }

  function filterTask(task) {
    if (filterAssignee && String(task.assignee_id) !== filterAssignee) return false
    if (filterPriority && task.priority !== filterPriority) return false
    if (filterStatus && task.status !== filterStatus) return false
    return true
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
    <div>
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
            <option key={m.user_id} value={String(m.user_id)}>
              {m.full_name}
            </option>
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

          return (
            <div key={group.project_id} className="bg-white rounded-xl border border-slate-200">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                <Link
                  to={`/projects/${group.project_id}`}
                  className="font-semibold text-slate-700 hover:text-blue-600 transition-colors"
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
                      className="px-4 py-2 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => { setEditingTask(task); setShowTaskModal(true) }}
                    >
                      <TaskCard task={task} />
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
