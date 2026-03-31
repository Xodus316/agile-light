import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/auth.js'

export default function AdminRoute({ children }) {
  const { user } = useAuthStore()

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}
