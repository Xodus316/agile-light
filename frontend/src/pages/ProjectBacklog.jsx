import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { getProject } from '../api/projects.js'
import { getTeam } from '../api/teams.js'
import { listTasks, updateTask } from '../api/tasks.js'
import { listSprints } from '../api/sprints.js'
import TaskModal from '../components/TaskModal.jsx'

const statusConfig = {
  todo: { label: 'To Do', classes: 'bg-gray-100 text-gray-600' },
  in_progress: { label: 'In Progress', classes: 'bg-blue-100 text-blue-700' },
  testing: { label: 'Testing', classes: 'bg-violet-100 text-violet-700' },
  ready_for_production: { label: 'Ready for Prod', classes: 'bg-amber-100 text-amber-700' },
  done: { label: 'Done', classes: 'bg-green-100 text-green-700' },
}

const priorityConfig = {
  low: { label: 'Low', classes: 'bg-green-100 text-green-700' },
  medium: { label: 'Medium', classes: 'bg-yellow-100 text-yellow-700' },
  high: { label: 'High', classes: 'bg-red-100 text-red-700' },
}

export default function ProjectBacklog() {
  const { projectId } = useParams()
  const [project, setProject] = useState(null)
  const [team, setTeam] = useState(null)
  const [allTasks, setAllTasks] = useState([])
  const [sprints, setSprints] = useState([])
  const [activeSprint, setActiveSprint] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [modalSprintId, setModalSprintId] = useState(null)

  const [selected, setSelected] = useState(new Set())
  const [targetSprintId, setTargetSprintId] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadData()
  }, [projectId])

  async function loadData() {
    try {
      const proj = await getProject(parseInt(projectId))
      setProject(proj)

      const [teamData, tasksData, sprintsData] = await Promise.all([
        getTeam(proj.team_id),
        listTasks({ project_id: parseInt(projectId) }),
        listSprints(proj.team_id),
      ])
      setTeam(teamData)
      setAllTasks(tasksData)
      setSprints(sprintsData)

      const active = sprintsData.find((s) => s.status === 'active')
      setActiveSprint(active || null)

      const assignable = sprintsData.filter((s) => s.status !== 'completed')
      if (assignable.length > 0) setTargetSprintId(String(assignable[0].id))
    } catch {
      setError('Failed to load project data')
    } finally {
      setLoading(false)
    }
  }

  const backlogTasks = allTasks.filter((t) => !t.sprint_id)
  const sprintTasks = activeSprint ? allTasks.filter((t) => t.sprint_id === activeSprint.id) : []
  const assignableSprints = sprints.filter((s) => s.status !== 'completed')

  function toggleSelect(taskId) {
    setSelected((prev) => {
      const s = new Set(prev)
      s.has(taskId) ? s.delete(taskId) : s.add(taskId)
      return s
    })
  }

  function toggleSelectAll() {
    const ids = backlogTasks.map((t) => t.id)
    const allSelected = ids.every((id) => selected.has(id))
    setSelected(() => {
      const s = new Set()
      if (!allSelected) ids.forEach((id) => s.add(id))
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
      const sprintId = parseInt(targetSprintId)
      setAllTasks((prev) =>
        prev.map((t) => selected.has(t.id) ? { ...t, sprint_id: sprintId } : t)
      )
      setSelected(new Set())
    } catch {
      setError('Failed to add some tasks to sprint')
    } finally {
      setAdding(false)
    }
  }

  async function handleMoveToSprint(task) {
    if (!activeSprint) return
    try {
      const updated = await updateTask(task.id, { sprint_id: activeSprint.id })
      setAllTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)))
    } catch {
      setError('Failed to move task to sprint')
    }
  }

  function handleTaskSaved(savedTask) {
    setAllTasks((prev) => {
      const exists = prev.find((t) => t.id === savedTask.id)
      if (exists) return prev.map((t) => (t.id === savedTask.id ? savedTask : t))
      return [...prev, savedTask]
    })
  }

  function handleTaskDeleted(taskId) {
    setAllTasks((prev) => prev.filter((t) => t.id !== taskId))
    setSelected((prev) => { const s = new Set(prev); s.delete(taskId); return s })
  }

  function openCreateModal(sprintId = null) {
    setEditingTask(null)
    setModalSprintId(sprintId)
    setShowTaskModal(true)
  }

  function openEditModal(task) {
    setEditingTask(task)
    setModalSprintId(null)
    setShowTaskModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  if (!project) return null

  const allBacklogSelected = backlogTasks.length > 0 && backlogTasks.every((t) => selected.has(t.id))
  const someBacklogSelected = backlogTasks.some((t) => selected.has(t.id))

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link to={`/teams/${project.team_id}`} className="hover:text-blue-600">{team?.name}</Link>
            <span>/</span>
            <span>{project.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
          {project.description && (
            <p className="text-slate-500 text-sm mt-1">{project.description}</p>
          )}
        </div>
        <button
          onClick={() => openCreateModal()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Task
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {activeSprint && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-slate-700">Active Sprint</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                {activeSprint.name}
              </span>
            </div>
            <Link
              to={`/sprints/${activeSprint.id}`}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              View Sprint Board
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          {sprintTasks.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 text-sm text-slate-400">
              No tasks in this sprint for this project.
            </div>
          ) : (
            <TaskTable tasks={sprintTasks} onRowClick={openEditModal} showMoveButton={false} />
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-700">
            Backlog
            <span className="ml-2 text-sm font-normal text-slate-400">({backlogTasks.length})</span>
          </h2>
          <button
            onClick={() => openCreateModal()}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add task
          </button>
        </div>

        {backlogTasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 px-5 py-8 text-center">
            <p className="text-slate-400 text-sm">No backlog items. Create a new task to get started.</p>
          </div>
        ) : (
          <TaskTable
            tasks={backlogTasks}
            onRowClick={openEditModal}
            showMoveButton={!!activeSprint}
            onMoveToSprint={handleMoveToSprint}
            selected={selected}
            onToggle={toggleSelect}
            onToggleAll={toggleSelectAll}
            allSelected={allBacklogSelected}
            someSelected={someBacklogSelected}
          />
        )}
      </div>

      {/* Sticky action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-xl shadow-2xl px-5 py-3 flex items-center gap-4 min-w-max">
          <span className="text-sm font-medium">
            {selected.size} task{selected.size !== 1 ? 's' : ''} selected
          </span>

          <div className="h-4 w-px bg-slate-600" />

          {assignableSprints.length === 0 ? (
            <span className="text-sm text-slate-400">No active or planned sprints</span>
          ) : (
            <>
              <select
                value={targetSprintId}
                onChange={(e) => setTargetSprintId(e.target.value)}
                className="bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {assignableSprints.map((s) => (
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

      {showTaskModal && (
        <TaskModal
          task={editingTask}
          projectId={parseInt(projectId)}
          sprintId={modalSprintId}
          members={team?.members || []}
          onClose={() => setShowTaskModal(false)}
          onSaved={handleTaskSaved}
          onDeleted={handleTaskDeleted}
        />
      )}
    </div>
  )
}

function TaskTable({ tasks, onRowClick, showMoveButton, onMoveToSprint, selected, onToggle, onToggleAll, allSelected, someSelected }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            {onToggle && (
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                  onChange={onToggleAll}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                />
              </th>
            )}
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Assignee</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
            {showMoveButton && <th className="px-4 py-3"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tasks.map((task) => {
            const status = statusConfig[task.status] || statusConfig.todo
            const priority = priorityConfig[task.priority] || priorityConfig.medium
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
            const isSelected = selected?.has(task.id)
            return (
              <tr
                key={task.id}
                onClick={() => onRowClick(task)}
                className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
              >
                {onToggle && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={!!isSelected}
                      onChange={() => onToggle(task.id)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                    />
                  </td>
                )}
                <td className="px-4 py-3 font-medium text-slate-800">{task.title}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.classes}`}>
                    {status.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.classes}`}>
                    {priority.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {task.assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-400 flex items-center justify-center text-white text-xs font-semibold">
                        {task.assignee.full_name.charAt(0).toUpperCase()}
                      </div>
                      {task.assignee.full_name}
                    </div>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className={`px-4 py-3 ${isOverdue ? 'text-red-500 font-medium' : 'text-slate-500'}`}>
                  {task.due_date
                    ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : <span className="text-slate-300">—</span>}
                </td>
                {showMoveButton && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onMoveToSprint(task)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                    >
                      Move to Sprint
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
