import { Loader } from 'lucide-react'

export default function Spinner({ size = 24, className = '' }) {
  return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <Loader size={size} className="animate-spin text-[#850000]" />
    </div>
  )
}