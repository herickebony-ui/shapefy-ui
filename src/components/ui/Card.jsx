export default function Card({ children, className = '', onClick, hover = false }) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-[#29292e] border border-[#323238] rounded-xl
        ${hover ? 'hover:border-[#850000]/40 hover:bg-[#2f2f34] transition-all cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}