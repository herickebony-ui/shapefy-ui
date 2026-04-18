export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-[#29292e] border border-[#323238] flex items-center justify-center">
          <Icon size={28} className="text-gray-600" />
        </div>
      )}
      <div>
        <p className="text-white font-medium mb-1">{title}</p>
        {description && <p className="text-gray-500 text-sm">{description}</p>}
      </div>
      {action}
    </div>
  )
}