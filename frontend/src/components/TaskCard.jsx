const priorityConfig = {
  low: { label: 'Low', classes: 'bg-green-100 text-green-700' },
  medium: { label: 'Medium', classes: 'bg-yellow-100 text-yellow-700' },
  high: { label: 'High', classes: 'bg-red-100 text-red-700' },
}

const statusConfig = {
  todo: { label: 'To Do', classes: 'bg-gray-100 text-gray-600' },
  in_progress: { label: 'In Progress', classes: 'bg-blue-100 text-blue-700' },
  testing: { label: 'Testing', classes: 'bg-violet-100 text-violet-700' },
  ready_for_production: { label: 'Ready for Prod', classes: 'bg-amber-100 text-amber-700' },
  done: { label: 'Done', classes: 'bg-green-100 text-green-700' },
}

export default function TaskCard({ task, onClick }) {
  const priority = priorityConfig[task.priority] || priorityConfig.medium
  const status = statusConfig[task.status] || statusConfig.todo

  const isOverdue =
    task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  const estimateLabel = task.estimate != null
    ? `${task.estimate}${task.estimate_unit === 'hours' ? 'h' : 'd'}`
    : null

  return (
    <div
      onClick={() => onClick && onClick(task)}
      className="bg-white rounded-lg border border-slate-200 p-3 mb-2 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="text-sm font-medium text-slate-800 mb-2 line-clamp-2">{task.title}</div>

      <div className="flex flex-wrap gap-1 mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.classes}`}>
          {priority.label}
        </span>
        {estimateLabel && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-500">
            {estimateLabel}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          {task.assignee && (
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-blue-400 flex items-center justify-center text-white text-xs font-semibold">
                {task.assignee.full_name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate max-w-[80px]">{task.assignee.full_name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {task.project && (
            <span className="text-slate-400 truncate max-w-[80px]">{task.project.name}</span>
          )}
          {task.due_date && (
            <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
              {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
