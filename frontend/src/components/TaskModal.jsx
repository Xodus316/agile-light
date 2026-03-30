import { useState, useEffect } from 'react'
import { createTask, updateTask, deleteTask } from '../api/tasks.js'

export default function TaskModal({ task, projectId, sprintId, members, onClose, onSaved, onDeleted }) {
  const isEditing = !!task

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    due_date: task?.due_date || '',
    assignee_id: task?.assignee_id || '',
    estimate: task?.estimate ?? '',
    estimate_unit: task?.estimate_unit || 'hours',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        status: form.status,
        priority: form.priority,
        due_date: form.due_date || null,
        assignee_id: form.assignee_id ? parseInt(form.assignee_id) : null,
        estimate: form.estimate !== '' ? parseFloat(form.estimate) : null,
        estimate_unit: form.estimate !== '' ? form.estimate_unit : null,
      }

      if (isEditing) {
        const updatePayload = {
          ...payload,
          clear_assignee: !form.assignee_id,
          clear_sprint: false,
        }
        const saved = await updateTask(task.id, updatePayload)
        onSaved(saved)
      } else {
        const createPayload = {
          ...payload,
          project_id: projectId,
          sprint_id: sprintId || null,
        }
        const saved = await createTask(createPayload)
        onSaved(saved)
      }
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save task')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setLoading(true)
    try {
      await deleteTask(task.id)
      onDeleted && onDeleted(task.id)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete task')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold text-slate-800">
            {isEditing ? 'Edit Task' : 'Create Task'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Task title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Task description (optional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="testing">Testing</option>
                <option value="ready_for_production">Ready for Production</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                name="due_date"
                value={form.due_date}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assignee</label>
              <select
                name="assignee_id"
                value={form.assignee_id}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Unassigned</option>
                {(members || []).map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estimate</label>
            <div className="flex gap-2">
              <input
                type="number"
                name="estimate"
                value={form.estimate}
                onChange={handleChange}
                min="0"
                step="0.5"
                placeholder="e.g. 3"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                name="estimate_unit"
                value={form.estimate_unit}
                onChange={handleChange}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className={`text-sm px-3 py-2 rounded-lg transition-colors ${
                    confirmDelete
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'text-red-500 hover:bg-red-50'
                  }`}
                >
                  {confirmDelete ? 'Confirm Delete' : 'Delete Task'}
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
