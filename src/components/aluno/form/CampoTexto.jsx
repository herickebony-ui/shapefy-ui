// Textarea autoexpansível padrão do formulário do aluno.
export default function CampoTexto({ value, onChange, placeholder = 'Sua resposta...' }) {
  return (
    <textarea
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
      style={{ minHeight: '3rem', overflow: 'hidden' }}
      placeholder={placeholder}
      className="w-full bg-[#0d0d0f] border border-[#1f1f24] focus:border-[#2563eb]/60 focus:shadow-[0_0_12px_rgba(37,99,235,0.15)] text-white text-sm rounded-xl px-3.5 py-2.5 outline-none resize-none leading-relaxed transition-all"
    />
  )
}
