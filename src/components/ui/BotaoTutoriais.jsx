// Botão de tutoriais em vídeo — "play" vermelho que abre um modal listando os
// vídeos do YouTube relacionados à tela. Cada vídeo vira um step com botão
// "Assistir no YouTube" que abre em nova aba.
//
// Props:
//   videos      — array de { title, description?, url } (obrigatório)
//   title?      — título do modal (default 'Tutoriais em vídeo')
//   subtitle?   — subtítulo (default 'Vídeos explicando esta tela')
//   size?       — 'sm' | 'md' | 'lg' | 'xl' (default 'lg')
//   className?  — classes extras pro botão
//   iconSize?   — tamanho do ícone (default 16)
//   tooltip?    — title do botão (default 'Tutoriais em vídeo')
//
// Uso típico:
//   <BotaoTutoriais videos={TUTORIAIS_MEUS_ALUNOS} />
import { useState } from 'react'
import { Play, ExternalLink } from 'lucide-react'
import InformativoModal from './InformativoModal'

export default function BotaoTutoriais({
  videos = [],
  title = 'Vídeo Aulas',
  subtitle = 'Vídeos explicando esta tela',
  size = 'lg',
  className = '',
  label = 'Vídeo Aulas',
  tooltip = 'Vídeo aulas desta tela',
}) {
  const [open, setOpen] = useState(false)

  if (!videos.length) return null

  const steps = videos.map((v) => ({
    icon: Play,
    title: v.title,
    description: v.description,
    action: (
      <a
        href={v.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#ef4444] hover:text-white hover:bg-[#ef4444] border border-[#ef4444]/40 hover:border-[#ef4444] rounded-lg px-2.5 h-7 transition-colors"
      >
        <Play size={12} fill="currentColor" /> Assistir no YouTube <ExternalLink size={10} />
      </a>
    ),
  }))

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={tooltip}
        className={`h-9 px-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#ef4444] hover:text-white bg-[#ef4444]/10 hover:bg-[#ef4444] border border-[#ef4444]/40 hover:border-[#ef4444] rounded-lg transition-colors shrink-0 whitespace-nowrap ${className}`}
      >
        <Play size={14} fill="currentColor" />
        <span className="hidden sm:inline">{label}</span>
      </button>
      <InformativoModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={title}
        subtitle={subtitle}
        size={size}
        icon={Play}
        iconVariant="primary"
        steps={steps}
        dismissLabel="Fechar"
      />
    </>
  )
}
