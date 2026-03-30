import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCenter,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { getSprint } from '../api/sprints.js'
import { getTeam } from '../api/teams.js'
import { listTasks, updateTask } from '../api/tasks.js'
import TaskCard from '../components/TaskCard.jsx'
import TaskModal from '../components/TaskModal.jsx'

const STATUSES = ['todo', 'in_progress', 'testing', 'ready_for_production', 'done']

const statusConfig = {
  todo: { label: 'To Do', color: 'bg-gray-100 text-gray-600', border: 'border-gray-200' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
  testing: { label: 'Testing', color: 'bg-violet-100 text-violet-700', border: 'border-violet-200' },
  ready_for_production: { label: 'Ready for Prod', color: 'bg-amber-100 text-amber-700', border: 'border-amber-200' },
  done: { label: 'Done', color: 'bg-green-100 text-green-700', border: 'border-green-200' },
}

const sprintStatusConfig = {
  planned: { label: 'Planned', classes: 'bg-gray-100 text-gray-600' },
  active: { label: 'Active', classes: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', classes: 'bg-green-100 text-green-700' },
}

// Draggable task card wrapper
function DraggableCard({ task, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(task.id),
    data: { task },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TaskCard task={task} onClick={onEdit} />
    </div>
  )
}

// Droppable column wrapper
function DroppableColumn({ status, count, children, isOver }) {
  const { setNodeRef } = useDroppable({ id: status })
  const config = statusConfig[status]

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${config.color}`}>
          {config.label}
        </span>
        <span className="text-xs text-slate-400 font-medium">{count}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl p-3 min-h-[200px] transition-colors border-2 ${
          isOver
            ? `bg-blue-50 ${config.border}`
            : 'bg-slate-100/60 border-transparent'
        }`}
      >
        {children}
      </div>
    </div>
  )
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

  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)

  // Track which column is being hovered during a drag
  const [activeId, setActiveId] = useState(null)
  const [overId, setOverId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require a 5px movement before starting drag — prevents accidental drags on click
      activationConstraint: { distance: 5 },
    })
  )

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
    } catch {
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

  function handleDragStart({ active }) {
    setActiveId(active.id)
  }

  function handleDragOver({ over }) {
    setOverId(over?.id ?? null)
  }

  async function handleDragEnd({ active, over }) {
    setActiveId(null)
    setOverId(null)

    if (!over) return

    // `over.id` is the target column status string
    const targetStatus = over.id
    const draggedTaskId = parseInt(active.id)
    const task = tasks.find((t) => t.id === draggedTaskId)

    if (!task || task.status === targetStatus) return

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === draggedTaskId ? { ...t, status: targetStatus } : t))
    )

    try {
      await updateTask(draggedTaskId, { status: targetStatus })
    } catch {
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === draggedTaskId ? { ...t, status: task.status } : t))
      )
      setError('Failed to update task status')
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

  const sprintStatus = sprintStatusConfig[sprint.status] || sprintStatusConfig.planned
  const activeTask = activeId ? tasks.find((t) => String(t.id) === activeId) : null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
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
            {sprint.goal && <span className="italic text-slate-400">"{sprint.goal}"</span>}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Sprint progress bar */}
      {(() => {
        const total = tasks.length
        const done = tasks.filter((t) => t.status === 'done').length
        const pct = total === 0 ? 0 : Math.round((done / total) * 100)

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        let daysLabel = null
        if (sprint.end_date) {
          const end = new Date(sprint.end_date)
          end.setHours(0, 0, 0, 0)
          const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
          if (diff < 0) daysLabel = { text: `${Math.abs(diff)} day${Math.abs(diff) !== 1 ? 's' : ''} overdue`, overdue: true }
          else if (diff === 0) daysLabel = { text: 'Due today', overdue: false }
          else daysLabel = { text: `${diff} day${diff !== 1 ? 's' : ''} to go`, overdue: false }
        }

        return (
          <div className="mb-4 bg-white rounded-xl border border-slate-200 px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-700">{pct}% complete</span>
                <span className="text-xs text-slate-400">{done} of {total} task{total !== 1 ? 's' : ''} done</span>
              </div>
              {daysLabel && (
                <span className={`text-sm font-medium ${daysLabel.overdue ? 'text-red-500' : 'text-slate-500'}`}>
                  {daysLabel.text}
                </span>
              )}
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-blue-400'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })()}

      {/* Filters */}
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

      {/* Kanban board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-5 gap-3 flex-1">
          {STATUSES.map((status) => {
            const config = statusConfig[status]
            const columnTasks = getFilteredTasks(status)
            return (
              <DroppableColumn key={status} status={status} count={columnTasks.length} isOver={overId === status}>
                {columnTasks.map((task) => (
                  <DraggableCard
                    key={task.id}
                    task={task}
                    onEdit={(t) => { setEditingTask(t); setShowTaskModal(true) }}
                  />
                ))}
                {columnTasks.length === 0 && (
                  <div className="text-center py-6 text-slate-300 text-sm">Drop tasks here</div>
                )}
              </DroppableColumn>
            )
          })}
        </div>

        {/* Drag overlay — ghost card that follows the cursor */}
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div className="rotate-1 shadow-xl opacity-90 w-full">
              <TaskCard task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
