import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getSprint } from '../api/sprints.js'
import { getTeam } from '../api/teams.js'
import { listTasks } from '../api/tasks.js'
import TaskCard from '../components/TaskCard.jsx'
import TaskModal from '../components/TaskModal.jsx'

const statusConfig = {
  todo: { label: 'To Do', color: 'bg-gray-100 text-gray-600' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  testing: { label: 'Testing', color: 'bg-violet-100 text-violet-700' },
  ready_for_production: { label: 'Ready for Prod', color: 'bg-amber-100 text-amber-700' },
  done: { label: 'Done', color: 'bg-green-100 text-green-700' },
}

const sprintStatusConfig = {
  planned: { label: 'Planned', classes: 'bg-gray-100 text-gray-600' },
  active: { label: 'Active', classes: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', classes: 'bg-green-100 text-green-700' },
}

export default function SprintBoard() {
  const { sprintId } = useParams()
  const [sprint, setSprint] = useState(null)
  const [team, setTeam] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filterAssignee, setFilterAssignee] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)

  useEffect(() => {
    loadData()
  }, [sprintId])

  async function loadData() {
    try {
      const sprintData = await getSprint(parseInt(sprintId))
      setSprint(sprintData)

      const [teamData, tasksData] = await Promise.all([
        getTeam(sprintData.team_id),
        listTasks({ sprint_id: parseInt(sprintId) }),
      ])
      setTeam(teamData)
      setTasks(tasksData)
    } catch (err) {
      setError('Failed to load sprint data')
    } finally {
      setLoading(false)
    }
  }

  function getFilteredTasks(status) {
    return tasks.filter((t) => {
      if (t.status !== status) return false
      if (filterAssignee && String(t.assignee_id) !== filterAssignee) return false
      if (filterPriority && t.priority !== filterPriority) return false
      return true
    })
  }

  function handleTaskSaved(savedTask) {
    setTasks((prev) => {
      const exists = prev.find((t) => t.id === savedTask.id)
      if (exists) return prev.map((t) => (t.id === savedTask.id ? savedTask : t))
      return [...prev, savedTask]
    })
  }

  function handleTaskDeleted(taskId) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  if (!sprint) return null

  const sprintStatus = sprintStatusConfig[sprint.status] || sprintStatusConfig.planned

  return (
    <div className="flex flex-col h-full">
      <div className="mb-5">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          {team && (
            <>
              <Link to={`/teams/${sprint.team_id}`} className="hover:text-blue-600">{team.name}</Link>
              <span>/</span>
              <Link to={`/teams/${sprint.team_id}/sprints`} className="hover:text-blue-600">Sprints</Link>
              <span>/</span>
            </>
          )}
          <span>{sprint.name}</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-800">{sprint.name}</h1>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sprintStatus.classes}`}>
            {sprintStatus.label}
          </span>
        </div>

        {(sprint.start_date || sprint.end_date || sprint.goal) && (
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
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
            {sprint.goal && (
              <span className="italic text-slate-400">"{sprint.goal}"</span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

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

        {(filterAssignee || filterPriority) && (
          <button
            onClick={() => { setFilterAssignee(''); setFilterPriority('') }}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Clear filters
          </button>
        )}

        <div className="ml-auto text-sm text-slate-400">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''} total
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 flex-1">
        {['todo', 'in_progress', 'testing', 'ready_for_production', 'done'].map((status) => {
          const config = statusConfig[status]
          const columnTasks = getFilteredTasks(status)
          return (
            <div key={status} className="flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${config.color}`}>
                  {config.label}
                </span>
                <span className="text-xs text-slate-400 font-medium">{columnTasks.length}</span>
              </div>
              <div className="flex-1 bg-slate-100/60 rounded-xl p-3 min-h-[200px]">
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={(t) => { setEditingTask(t); setShowTaskModal(true) }}
                  />
                ))}
                {columnTasks.length === 0 && (
                  <div className="text-center py-6 text-slate-300 text-sm">No tasks</div>
                )}
              </div>
            </div>
          )
        })}
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
