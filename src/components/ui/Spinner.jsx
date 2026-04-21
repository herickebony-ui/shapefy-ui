import { Loader } from 'lucide-react'

const SIZE_MAP = { sm: 16, md: 20, lg: 24, xl: 32 }

export default function Spinner({ size = 'md', className = '' }) {
  const px = typeof size === 'number' ? size : (SIZE_MAP[size] ?? 20)
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <Loader size={px} className="animate-spin text-[#2563eb]/60" strokeWidth={1.5} />
    </div>
  )
}