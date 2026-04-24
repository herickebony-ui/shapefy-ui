export default function PageHeader({ title, description, action }) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-lg md:text-xl font-bold text-white tracking-tight">{title}</h1>
        {description && <p className="text-gray-400 text-sm mt-1">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}