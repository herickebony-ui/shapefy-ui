import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Rocket, UtensilsCrossed, Dumbbell, Waves, Wind, BookOpen } from 'lucide-react'
import { InformativoModal, Button } from './ui'
import useAuthStore from '../store/authStore'
import useOnboardingStore, { THRESHOLDS, SHOW_RECOMENDADO, MAX_MODAL_APPEARANCES } from '../store/onboardingStore'

const ROTAS = {
  alimentos:    '/alimentos',
  exercicios:   '/exercicios',
  alongamentos: '/alongamentos',
  aerobicos:    '/aerobicos',
}

const ICONS = {
  alimentos:    UtensilsCrossed,
  exercicios:   Dumbbell,
  alongamentos: Waves,
  aerobicos:    Wind,
}

export default function OnboardingModal() {
  const navigate = useNavigate()
  const modulos = useAuthStore(s => s.modulos)
  const counts = useOnboardingStore(s => s.counts)
  const modalAppearances = useOnboardingStore(s => s.modalAppearances)
  const incrementModalAppearance = useOnboardingStore(s => s.incrementModalAppearance)

  const [open, setOpen] = useState(false)
  const lastAppearancesRef = useRef(modalAppearances)

  useEffect(() => {
    if (open) return
    if (!counts) return
    if (modalAppearances >= MAX_MODAL_APPEARANCES) {
      lastAppearancesRef.current = modalAppearances
      return
    }
    // Não reabrir no mesmo ciclo: só dispara quando o contador NÃO foi incrementado ainda
    // nesta instância (ou quando alguém resetou o contador externamente).
    if (modalAppearances > lastAppearancesRef.current) {
      lastAppearancesRef.current = modalAppearances
      return
    }

    const pendentes = []
    if (modulos?.dieta  && counts.alimentos    < THRESHOLDS.alimentos)    pendentes.push('alimentos')
    if (modulos?.treino && counts.exercicios   < THRESHOLDS.exercicios)   pendentes.push('exercicios')
    if (modulos?.treino && counts.alongamentos < THRESHOLDS.alongamentos) pendentes.push('alongamentos')
    if (modulos?.treino && counts.aerobicos    < THRESHOLDS.aerobicos)    pendentes.push('aerobicos')

    if (pendentes.length === 0) return

    incrementModalAppearance()
    lastAppearancesRef.current = modalAppearances + 1
    queueMicrotask(() => setOpen(true))
  }, [counts, modulos, modalAppearances, incrementModalAppearance, open])

  if (!counts) return null

  const steps = []

  const add = (id, title, description) => {
    const count = counts[id]
    const faltam = Math.max(0, THRESHOLDS[id] - count)
    const ok = faltam === 0
    const descOk = `${description} Você já tem uma base boa!`
    const descPend = SHOW_RECOMENDADO[id]
      ? `${description} Importe pelo menos ${faltam} da biblioteca.`
      : `${description} Importe ao menos um da biblioteca para começar.`
    steps.push({
      icon: ICONS[id],
      title: `${title} — ${count} cadastrado${count !== 1 ? 's' : ''}`,
      description: ok ? descOk : descPend,
      action: (
        <Button
          variant="secondary"
          size="xs"
          icon={BookOpen}
          onClick={() => { setOpen(false); navigate(ROTAS[id]) }}
        >
          Ir para {title}
        </Button>
      ),
    })
  }

  if (modulos?.dieta)  add('alimentos',    'Alimentos',            'Base para montar as dietas dos alunos.')
  if (modulos?.treino) add('exercicios',   'Exercícios de treino', 'Base para montar as fichas dos alunos.')
  if (modulos?.treino) add('alongamentos', 'Alongamentos',         'Usados na planilha de alongamentos das fichas.')
  if (modulos?.treino) add('aerobicos',    'Aeróbicos',            'Usados na periodização aeróbica das fichas.')

  const restantes = Math.max(0, MAX_MODAL_APPEARANCES - modalAppearances)

  return (
    <InformativoModal
      isOpen={open}
      onClose={() => setOpen(false)}
      title="Bem-vindo ao Shapefy"
      subtitle="Seu sistema começa com o catálogo vazio — importe da biblioteca para agilizar"
      size="xl"
      icon={Rocket}
      iconVariant="warning"
      steps={steps}
      dismissLabel="Começar depois"
    >
      <p className="text-gray-300 text-sm leading-relaxed text-center">
        Para montar dietas e fichas de treino você precisa de uma base de alimentos e exercícios.
        Use a <strong className="text-white">Explorar Biblioteca</strong> em cada tela para importar com um clique —
        depois é só editar, ativar/desativar ou criar os seus próprios.
      </p>
      {restantes > 0 && restantes < MAX_MODAL_APPEARANCES && (
        <p className="text-gray-500 text-[11px] text-center">
          Este lembrete aparecerá mais {restantes} {restantes === 1 ? 'vez' : 'vezes'}.
        </p>
      )}
    </InformativoModal>
  )
}
