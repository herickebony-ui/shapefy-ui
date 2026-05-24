// Bloco HTML — renderiza o conteúdo cru do backend com estilo prose-invert.
export default function CampoBlocoHTML({ html }) {
  return (
    <div className="px-4 py-3 bg-[#0a0a0c] border-l-2 border-[#2563eb]/40 my-2 rounded-r-lg">
      <div
        className="text-xs text-gray-400 leading-relaxed prose prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
