// Label de pergunta — texto branco com indicador opcional de obrigatório.
export default function CampoLabel({ children, obrigatorio }) {
  return (
    <p className="text-white text-sm font-semibold leading-snug mb-2.5">
      {children}
      {obrigatorio && <span className="text-[#60a5fa] ml-1">*</span>}
    </p>
  )
}
