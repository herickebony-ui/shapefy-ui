import { createPortal } from 'react-dom'
import { Check, AlertCircle, RefreshCw } from 'lucide-react'

export default function Toast({ show, msg, type = 'success' }) {
  if (!show || typeof document === 'undefined') return null
  const styles = {
    success: 'bg-green-500/15 border-green-500/40 text-green-300',
    info:    'bg-blue-500/15 border-blue-500/40 text-blue-300',
    error:   'bg-red-500/15 border-red-500/40 text-red-300',
  }
  const Icon = type === 'error' ? AlertCircle : type === 'info' ? RefreshCw : Check
  return createPortal(
    <div className={`fixed top-6 right-6 z-[99999] px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl flex items-center gap-2 text-sm font-semibold animate-in slide-in-from-top-2 fade-in duration-200 ${styles[type] || styles.success}`}>
      <Icon size={16} />
      <span>{msg}</span>
    </div>,
    document.body,
  )
}
