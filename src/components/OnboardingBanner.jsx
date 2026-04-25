import { useNavigate } from 'react-router-dom'
import { CheckCircle2, AlertCircle, ArrowRight, X, HelpCircle } from 'lucide-react'
import useAuthStore from '../store/authStore'
import useOnboardingStore, { THRESHOLDS, SHOW_RECOMENDADO } from '../store/onboardingStore'
import { Button } from './ui'

const ROTAS = {
  alimentos:    '/alimentos',
  exercicios:   '/exercicios',
  alongamentos: '/alongamentos',
  aerobicos:    '/aerobicos',
}

const LABELS = {
  alimentos:    'Alimentos',
  exercicios:   'Exercícios de treino',
  alongamentos: 'Alongamentos',
  aerobicos:    'Aeróbicos',
}

export default function OnboardingBanner() {
  const navigate = useNavigate()
  const modulos = useAuthStore(s => s.modulos)
  const counts = useOnboardingStore(s => s.counts)
  const bannerDismissed = useOnboardingStore(s => s.bannerDismissed)
  const dismissBanner = useOnboardingStore(s => s.dismissBanner)
  const resetModalAppearances = useOnboardingStore(s => s.resetModalAppearances)

  if (!counts || bannerDismissed) return null

  const itens = []
  if (modulos?.dieta)  itens.push({ id: 'alimentos',    count: counts.alimentos })
  if (modulos?.treino) itens.push({ id: 'exercicios',   count: counts.exercicios })
  if (modulos?.treino) itens.push({ id: 'alongamentos', count: counts.alongamentos })
  if (modulos?.treino) itens.push({ id: 'aerobicos',    count: counts.aerobicos })

  if (itens.length === 0) return null

  const pendentes = itens.filter(i => i.count < THRESHOLDS[i.id])
  if (pendentes.length === 0) return null

  return (
    <div className="rounded-lg border bg-[rgba(234,179,8,0.08)] border-[rgba(234,179,8,0.3)] mb-4">
      <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold italic uppercase tracking-[0.12em] text-[#facc15]">
            Configure seu catálogo
          </p>
          <p className="text-gray-400 text-xs mt-0.5">
            Seu sistema começa zerado — importe da biblioteca Shapefy para agilizar a criação de dietas e treinos.
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={resetModalAppearances}
            title="Ver tutorial novamente"
            className="h-7 w-7 flex items-center justify-center rounded-lg text-[#facc15] hover:text-black hover:bg-[#facc15] transition-colors"
          >
            <HelpCircle size={14} />
          </button>
          <button
            onClick={dismissBanner}
            title="Ocultar"
            className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-[#323238] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {itens.map(item => {
          const ok = item.count >= THRESHOLDS[item.id]
          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                ok
                  ? 'bg-green-500/5 border-green-500/20'
                  : 'bg-[#1a1a1a] border-[#323238]'
              }`}
            >
              {ok
                ? <CheckCircle2 size={16} className="text-green-400 shrink-0" />
                : <AlertCircle  size={16} className="text-[#facc15] shrink-0" />
              }
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-medium leading-tight truncate">
                  {LABELS[item.id]}
                </p>
                <p className={`text-[11px] mt-0.5 tabular-nums ${ok ? 'text-green-400' : 'text-gray-500'}`}>
                  {item.count} cadastrado{item.count !== 1 ? 's' : ''}
                  {!ok && SHOW_RECOMENDADO[item.id] && (
                    <span className="text-gray-600"> · recomendado {THRESHOLDS[item.id]}+</span>
                  )}
                </p>
              </div>
              {!ok && (
                <Button
                  variant="secondary"
                  size="xs"
                  iconRight={ArrowRight}
                  onClick={() => navigate(ROTAS[item.id])}
                  className="shrink-0"
                >
                  Abrir
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
