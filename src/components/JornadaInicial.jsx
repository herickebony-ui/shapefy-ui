// Passo a passo de início pra novos profissionais. Mostra na tela principal
// (/anamneses). Detecta automaticamente o que já foi feito consultando o
// backend, e marca cada passo como completo / pendente. Pode ser ocultado
// quando todos os passos terminam (e reaparece se o profissional dismisse e
// resetar via botão "?").
//
// Os passos respeitam os módulos do plano (modulos.dieta / modulos.treino /
// modulos.feedback). Catálogo (alimentos/exercicios/alongamentos/aerobicos)
// continua sendo coberto pelo OnboardingBanner — esse componente foca na
// jornada de "do zero ao primeiro envio".

import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2, Circle, ArrowRight, X, Users, ClipboardList,
  MessageSquare, Apple, Dumbbell, ChevronDown, ChevronUp,
} from 'lucide-react'
import useAuthStore from '../store/authStore'
import { buscarContagensJornada } from '../api/onboarding'
import { Button } from './ui'

const STORAGE_KEY = 'shapefy-jornada-dismissed'

export default function JornadaInicial() {
  const navigate = useNavigate()
  const modulos = useAuthStore(s => s.modulos)
  const [counts, setCounts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
  })

  useEffect(() => {
    let cancelled = false
    buscarContagensJornada()
      .then(c => { if (!cancelled) setCounts(c) })
      .catch(e => {
        console.error('Erro ao carregar jornada:', e)
        // fallback: assume tudo zerado pra ainda mostrar a jornada pro
        // profissional, mesmo se algum doctype falhou na contagem.
        if (!cancelled) setCounts({ alunos: 0, formAnamnese: 0, formFeedback: 0, dietas: 0, fichas: 0 })
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const passos = useMemo(() => {
    if (!counts) return []
    const arr = []

    arr.push({
      id: 'aluno',
      icon: Users,
      titulo: 'Cadastre seu primeiro aluno',
      descricao: 'Tudo gira em torno dos alunos. Vincule uma anamnese ou crie um aluno direto pra começar a montar dieta e treino.',
      done: counts.alunos > 0,
      acao: { label: 'Vincular anamnese', onClick: () => navigate('/anamneses') },
    })

    arr.push({
      id: 'form_anamnese',
      icon: ClipboardList,
      titulo: 'Crie um formulário de anamnese',
      descricao: 'Template do questionário inicial que o aluno responde. Você cria uma vez e reutiliza pra todo aluno novo.',
      done: counts.formAnamnese > 0,
      acao: { label: 'Criar anamnese', onClick: () => navigate('/formularios/anamnese') },
    })

    if (modulos?.feedback !== false) {
      arr.push({
        id: 'form_feedback',
        icon: MessageSquare,
        titulo: 'Crie um formulário de feedback',
        descricao: 'Template do feedback recorrente (semanal/quinzenal/mensal) pra acompanhar o aluno ao longo do plano.',
        done: counts.formFeedback > 0,
        acao: { label: 'Criar feedback', onClick: () => navigate('/formularios/feedback') },
      })
    }

    if (modulos?.dieta) {
      arr.push({
        id: 'dieta',
        icon: Apple,
        titulo: 'Monte a primeira dieta',
        descricao: 'Use seus alimentos pra montar a dieta do primeiro aluno. Você pode duplicar e adaptar pros próximos.',
        done: counts.dietas > 0,
        acao: { label: 'Nova dieta', onClick: () => navigate('/dietas') },
      })
    }

    if (modulos?.treino) {
      arr.push({
        id: 'ficha',
        icon: Dumbbell,
        titulo: 'Monte a primeira ficha de treino',
        descricao: 'Use seus exercícios pra montar a ficha do primeiro aluno. Configure dias da semana, periodização e observações.',
        done: counts.fichas > 0,
        acao: { label: 'Nova ficha', onClick: () => navigate('/fichas') },
      })
    }

    return arr
  }, [counts, modulos, navigate])

  if (loading) return null
  if (passos.length === 0) return null

  const completos = passos.filter(p => p.done).length
  const total = passos.length
  const tudoFeito = completos === total

  if (tudoFeito) return null

  // Se o profissional está com tudo zerado (novo usuário de verdade),
  // ignora a flag de dismiss persistida — pode ter ficado de um teste
  // anterior na mesma máquina.
  const usuarioNovo = completos === 0
  if (dismissed && !usuarioNovo) return null

  const handleDismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-[rgba(234,179,8,0.06)] mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-amber-500/15">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold italic uppercase tracking-[0.12em] text-[#facc15]">
            Comece por aqui
          </p>
          <p className="text-white text-sm font-semibold mt-0.5">
            Configure sua conta para começar a atender alunos
          </p>
          <p className="text-gray-400 text-xs mt-1">
            {completos} de {total} {completos === 1 ? 'passo concluído' : 'passos concluídos'}
            {' · '}cada item é detectado automaticamente assim que você completa.
          </p>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${(completos / total) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setCollapsed(v => !v)}
            title={collapsed ? 'Expandir' : 'Recolher'}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-[#323238] transition-colors"
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          <button
            onClick={handleDismiss}
            title="Ocultar passo a passo"
            className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-[#323238] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <ol className="px-4 py-3 space-y-2">
          {passos.map((p, i) => {
            const Icone = p.icon
            return (
              <li
                key={p.id}
                className={`flex items-start gap-3 rounded-lg border px-3 py-3 transition-colors ${
                  p.done
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-[#1a1a1a] border-[#323238]'
                }`}
              >
                <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                  p.done
                    ? 'bg-green-500/15 text-green-400'
                    : 'bg-amber-500/15 text-amber-400'
                }`}>
                  {p.done ? <CheckCircle2 size={16} /> : <Icone size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold leading-tight ${
                    p.done ? 'text-gray-400 line-through' : 'text-white'
                  }`}>
                    <span className="text-gray-600 mr-1.5 tabular-nums">{i + 1}.</span>
                    {p.titulo}
                  </p>
                  {!p.done && (
                    <p className="text-gray-400 text-xs mt-1 leading-relaxed">{p.descricao}</p>
                  )}
                </div>
                {!p.done && p.acao && (
                  <Button
                    variant="secondary"
                    size="xs"
                    iconRight={ArrowRight}
                    onClick={p.acao.onClick}
                    className="shrink-0 self-center"
                  >
                    {p.acao.label}
                  </Button>
                )}
                {p.done && (
                  <Circle size={6} className="text-green-400 fill-green-400 self-center shrink-0" />
                )}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
