// Botão de ajuda contextual — uma "?" pequena que abre um modal com tópicos
// explicando a tela. Reaproveita o InformativoModal pra não duplicar layout.
//
// Props:
//   title       — título do modal de ajuda (ex: "Como criar um formulário")
//   subtitle?   — subtítulo opcional
//   topicos     — array de { icon?, title, description } (mesmo shape de steps)
//   size?       — 'sm' | 'md' | 'lg' | 'xl'   (default 'lg' pra caber tópicos lado a lado)
//   className?  — classes extras pro botão
//   iconSize?   — tamanho do ícone "?"   (default 14)
//   tooltip?    — title do botão (default 'Ajuda desta tela')
//
// Uso típico:
//   <BotaoAjuda
//     title="Novo Formulário de Anamnese"
//     topicos={[
//       { icon: Type,  title: 'Título', description: '...' },
//       { icon: Plus,  title: 'Adicionar pergunta', description: '...' },
//     ]}
//   />
import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import InformativoModal from './InformativoModal'

export default function BotaoAjuda({
  title,
  subtitle,
  topicos = [],
  size = 'lg',
  className = '',
  iconSize = 14,
  tooltip = 'Ajuda desta tela',
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={tooltip}
        className={`h-7 w-7 flex items-center justify-center text-amber-400 hover:text-white bg-amber-500/10 hover:bg-amber-500 border border-amber-500/40 hover:border-amber-500 rounded-lg transition-colors shrink-0 ${className}`}
      >
        <HelpCircle size={iconSize} />
      </button>
      <InformativoModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={title}
        subtitle={subtitle}
        size={size}
        icon={HelpCircle}
        iconVariant="warning"
        steps={topicos}
        dismissLabel="Fechar"
      />
    </>
  )
}
