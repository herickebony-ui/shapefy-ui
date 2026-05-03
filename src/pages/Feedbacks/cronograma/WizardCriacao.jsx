import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Save } from 'lucide-react'
import { Modal, Button, FormGroup, Input, Select } from '../../../components/ui'

import { calcPlanEnd, fmtDateBR, todayISO, WEEKDAYS } from './utils'
import { gerarDatasSerie, agruparPorCiclo } from './serie'
import { salvarAluno } from '../../../api/alunos'
import { sincronizarCronogramaDoAluno } from '../../../api/cronogramaFeedbacks'
import TipoBotao from './TipoBotao'

const DIAS_SEMANA_OPTS = [
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Segunda-feira' },
  { value: '2', label: 'Terça-feira' },
  { value: '3', label: 'Quarta-feira' },
  { value: '4', label: 'Quinta-feira' },
  { value: '5', label: 'Sexta-feira' },
  { value: '6', label: 'Sábado' },
]

export default function WizardCriacao({
  alunoId,
  alunoNome,
  aluno = null,
  contratoRelevante = null,
  formularios,
  feriasList = [],
  initial = {},
  onClose,
  onSuccess,
  showToast = () => {},
}) {
  const [step, setStep] = useState(1)
  const [salvando, setSalvando] = useState(false)

  // Filtra formulários compatíveis com o plano do aluno (dieta/treino)
  // Se o aluno não tem dieta/treino preenchidos, mostra todos.
  const formulariosCompativeis = useMemo(() => {
    if (!aluno || (aluno.dieta == null && aluno.treino == null)) return formularios
    const aDieta = !!aluno.dieta
    const aTreino = !!aluno.treino
    const matches = formularios.filter(f => !!f.dieta === aDieta && !!f.treino === aTreino)
    // Fallback: se nenhum bate exatamente, mostra todos pra não bloquear
    return matches.length ? matches : formularios
  }, [aluno, formularios])

  // Pré-preenche plan_start: aluno.plan_start > contrato pago-e-não-iniciado
  // (data_pagamento_principal) > hoje. data_inicio do contrato vigente também
  // serve se existir.
  const planStartSugerido = useMemo(() => {
    if (initial.plan_start) return initial.plan_start
    const ini = contratoRelevante?.data_inicio?.slice(0, 10)
    if (ini) return ini
    const dp = contratoRelevante?.data_pagamento_principal?.slice(0, 10)
    if (dp) return dp
    return todayISO()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Step 1
  const [vigencia, setVigencia] = useState({
    plan_start: planStartSugerido,
    plan_duration: initial.plan_duration || 6,
    formulario_padrao: initial.formulario_padrao
      || formulariosCompativeis.find(f => f.enabled !== 0)?.name
      || formulariosCompativeis[0]?.name
      || '',
  })
  const planEnd = useMemo(
    () => calcPlanEnd(vigencia.plan_start, vigencia.plan_duration),
    [vigencia.plan_start, vigencia.plan_duration],
  )

  // Step 2
  const [serie, setSerie] = useState({
    intervalo: 14,
    unidade: 'dias',
    dia_semana: '1', // segunda
    pular_feriados: true,
    pular_ferias: true,
  })

  // Datas geradas (vivem no estado a partir do passo 2)
  const [datas, setDatas] = useState([])

  const datasPreview = useMemo(() => {
    if (!vigencia.plan_start || !planEnd) return []
    return gerarDatasSerie({
      data_inicio: vigencia.plan_start,
      data_fim: planEnd,
      intervalo: serie.intervalo,
      unidade: serie.unidade,
      pular_ferias: serie.pular_ferias,
      feriasList,
      pular_feriados: serie.pular_feriados,
      dia_semana: Number(serie.dia_semana),
    })
  }, [vigencia.plan_start, planEnd, serie, feriasList])

  const datasValidas = datasPreview.filter(d => !d.emFerias && !d.emFeriado)

  const passoStep2ParaStep3 = () => {
    // Materializa as datas no estado: primeira é Marco Zero, demais Feedback comum
    const arr = datasValidas.map((d, i) => ({
      date: d.iso,
      is_start: i === 0,
      is_training: false,
    }))
    setDatas(arr)
    setStep(3)
  }

  const toggleTraining = (date, novoVal) => {
    setDatas(prev => prev.map(d => d.date === date ? { ...d, is_training: novoVal } : d))
  }

  // Grupos por ciclo (Marco Zero/Trocas → headers "X semanas")
  const grupos = useMemo(() => agruparPorCiclo(datas), [datas])

  const numTrocas = datas.filter(d => d.is_training).length
  const numEncontros = datas.filter(d => !d.is_start).length
  const totalSemanas = useMemo(() => {
    if (datas.length < 2) return 0
    const sorted = [...datas].sort((a, b) => a.date.localeCompare(b.date))
    return Math.round(
      (new Date(sorted[sorted.length - 1].date) - new Date(sorted[0].date)) / (7 * 86400000),
    )
  }, [datas])

  // Validação por step
  const step1Valido = !!vigencia.plan_start && Number(vigencia.plan_duration) > 0 && !!vigencia.formulario_padrao && !!planEnd
  const step2Valido = datasValidas.length > 0
  const step3Valido = datas.length > 0

  const handleSalvar = async () => {
    if (!alunoId || !step3Valido) return
    setSalvando(true)
    try {
      await salvarAluno(alunoId, {
        plan_start: vigencia.plan_start,
        plan_end: planEnd,
        plan_duration: Number(vigencia.plan_duration),
        formulario_padrao: vigencia.formulario_padrao,
      })
      await sincronizarCronogramaDoAluno(alunoId, datas.map(d => ({
        formulario: vigencia.formulario_padrao,
        data_agendada: d.date,
        dias_aviso: 1,
        status: 'Agendado',
        observacao: '',
        nota: '',
        is_start: d.is_start ? 1 : 0,
        is_training: d.is_training ? 1 : 0,
      })))
      showToast('Cronograma criado!', 'success')
      onSuccess?.()
    } catch (e) {
      console.error(e)
      showToast('Falha ao salvar cronograma', 'error')
    } finally {
      setSalvando(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  const stepLabel = (n, label) => (
    <div className="flex flex-col items-center gap-1">
      <div className={`h-7 w-7 flex items-center justify-center rounded-full font-bold text-xs ${
        step === n
          ? 'bg-[#850000] text-white'
          : step > n
            ? 'bg-[#2563eb] text-white'
            : 'bg-[#1a1a1a] text-gray-500 border border-[#323238]'
      }`}>
        {step > n ? '✓' : n}
      </div>
      <span className={`text-[10px] uppercase tracking-widest font-bold ${
        step >= n ? 'text-white' : 'text-gray-500'
      }`}>{label}</span>
    </div>
  )

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Configurar cronograma${alunoNome ? ` — ${alunoNome}` : ''}`}
      subtitle="Em 3 passos rápidos: vigência, série e trocas de treino"
      size="xl"
      closeOnOverlayClick={false}
      footer={
        <>
          {step === 1 && (
            <>
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button variant="primary" iconRight={ChevronRight}
                disabled={!step1Valido}
                onClick={() => setStep(2)}>
                Próximo
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="ghost" icon={ChevronLeft} onClick={() => setStep(1)}>Voltar</Button>
              <Button variant="primary" iconRight={ChevronRight}
                disabled={!step2Valido}
                onClick={passoStep2ParaStep3}>
                Próximo
              </Button>
            </>
          )}
          {step === 3 && (
            <>
              <Button variant="ghost" icon={ChevronLeft} onClick={() => setStep(2)}>Voltar</Button>
              <Button variant="primary" icon={Save}
                loading={salvando}
                disabled={!step3Valido}
                onClick={handleSalvar}>
                Salvar tudo
              </Button>
            </>
          )}
        </>
      }
    >
      <div className="p-4 space-y-4">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-3 pb-3 border-b border-[#323238]">
          {stepLabel(1, 'Vigência')}
          <div className="flex-1 max-w-[60px] h-px bg-[#323238]" />
          {stepLabel(2, 'Datas')}
          <div className="flex-1 max-w-[60px] h-px bg-[#323238]" />
          {stepLabel(3, 'Trocas')}
        </div>

        {/* ── Step 1: Vigência ──────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-3">
            {/* Banner: contrato pago e não iniciado encontrado no Financeiro */}
            {contratoRelevante && !contratoRelevante.data_inicio && contratoRelevante.data_pagamento_principal && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-3 py-2 text-blue-200 text-xs">
                <strong>Contrato pago em {fmtDateBR(contratoRelevante.data_pagamento_principal)}</strong> ainda
                sem data de início no Financeiro. Sugerimos iniciar o cronograma a partir dessa data —
                ajuste se for outro dia.
              </div>
            )}
            {contratoRelevante && contratoRelevante.data_inicio && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2 text-emerald-200 text-xs">
                Vigência puxada do contrato <span className="font-mono text-emerald-300">{contratoRelevante.name}</span>
                {' ('}{fmtDateBR(contratoRelevante.data_inicio)} → {fmtDateBR(contratoRelevante.data_fim)}{').'}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormGroup label="Quando começa o plano?" required>
                <Input type="date" value={vigencia.plan_start}
                  onChange={(v) => setVigencia(p => ({ ...p, plan_start: v }))} />
              </FormGroup>
              <FormGroup label="Duração (meses)" required hint="Fim calculado automaticamente">
                <Input type="number" value={String(vigencia.plan_duration)}
                  onChange={(v) => setVigencia(p => ({ ...p, plan_duration: Number(v) || 0 }))} />
              </FormGroup>
            </div>

            <div className="bg-[#1a1a1a] border border-[#323238] rounded-lg p-3 text-sm">
              <span className="text-gray-400">Fim do plano: </span>
              <span className="text-white font-semibold">
                {planEnd ? fmtDateBR(planEnd) : '—'}
              </span>
            </div>

            <FormGroup label="Formulário padrão deste aluno" required
              hint={
                aluno && (aluno.dieta != null || aluno.treino != null)
                  ? `Mostrando só formulários compatíveis com o plano da aluna (dieta: ${aluno.dieta ? 'sim' : 'não'} · treino: ${aluno.treino ? 'sim' : 'não'})`
                  : 'Será usado em todos os agendamentos do cronograma'
              }>
              <Select
                value={vigencia.formulario_padrao}
                onChange={(v) => setVigencia(p => ({ ...p, formulario_padrao: v }))}
                options={formulariosCompativeis.map(f => ({ value: f.name, label: f.titulo }))}
                placeholder="Selecione um formulário..."
              />
            </FormGroup>
          </div>
        )}

        {/* ── Step 2: Gerar série ───────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FormGroup label="A cada">
                <Input type="number" value={String(serie.intervalo)}
                  onChange={(v) => setSerie(p => ({ ...p, intervalo: Number(v) || 1 }))} />
              </FormGroup>
              <FormGroup label="Unidade">
                <Select
                  value={serie.unidade}
                  onChange={(v) => setSerie(p => ({ ...p, unidade: v }))}
                  options={[
                    { value: 'dias', label: 'Dias' },
                    { value: 'semanas', label: 'Semanas' },
                  ]}
                />
              </FormGroup>
              <FormGroup label="Sempre na">
                <Select
                  value={serie.dia_semana}
                  onChange={(v) => setSerie(p => ({ ...p, dia_semana: v }))}
                  options={DIAS_SEMANA_OPTS}
                />
              </FormGroup>
            </div>

            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={serie.pular_feriados}
                  onChange={(e) => setSerie(p => ({ ...p, pular_feriados: e.target.checked }))} />
                <span className="text-xs text-gray-300 font-medium">Pular feriados nacionais</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={serie.pular_ferias}
                  onChange={(e) => setSerie(p => ({ ...p, pular_ferias: e.target.checked }))} />
                <span className="text-xs text-gray-300 font-medium">Pular períodos de férias cadastrados</span>
              </label>
            </div>

            <div className="bg-[#0a0a0a] border border-[#323238] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                  Datas geradas
                </span>
                <span className="text-[10px] text-gray-400">
                  {datasValidas.length} datas
                  {(datasPreview.length - datasValidas.length) > 0 &&
                    ` · ${datasPreview.length - datasValidas.length} puladas`}
                </span>
              </div>
              {datasPreview.length === 0 ? (
                <p className="text-xs text-gray-600 italic">Configure os filtros acima.</p>
              ) : (
                <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                  {datasPreview.map((d, i) => {
                    const pulada = d.emFerias || d.emFeriado
                    const motivo = d.emFeriado ? 'feriado' : d.emFerias ? 'férias' : ''
                    return (
                      <span key={i}
                        title={pulada ? `Pulada (${motivo}${d.feriadoNome ? `: ${d.feriadoNome}` : ''})` : ''}
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          pulada
                            ? 'bg-red-500/10 border-red-500/30 text-red-300/60 line-through'
                            : i === 0 || datasValidas[0]?.iso === d.iso
                              ? 'bg-[#2563eb]/15 border-[#2563eb]/40 text-blue-300'
                              : 'bg-[#1a1a1a] border-[#323238] text-gray-300'
                        }`}>
                        {fmtDateBR(d.iso)}
                      </span>
                    )
                  })}
                </div>
              )}
              {datasValidas.length > 0 && (
                <p className="text-[10px] text-blue-300/80 mt-2">
                  A primeira data ({fmtDateBR(datasValidas[0].iso)}) será o Marco Zero do aluno.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Step 3: Marcar trocas ─────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400">
              Clique em <span className="text-orange-400 font-semibold">Feedback</span> para marcá-la
              como <span className="text-purple-400 font-semibold">Troca de Treino</span>.
              Marco Zero é fixo (primeira data).
            </p>

            <div className="bg-[#0a0a0a] border border-[#323238] rounded-lg overflow-hidden max-h-80 overflow-y-auto">
              {grupos.map((grupo, gi) => (
                <section key={gi} aria-label={grupo.label}>
                  <div className="flex items-center gap-2 px-3 pt-3 pb-1.5 bg-[#1a1a1a]/40">
                    <div className="flex-1 h-px bg-[#323238]" />
                    <span className={`text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${
                      grupo.label === 'Ciclo a definir'
                        ? 'text-gray-500 italic'
                        : 'text-purple-300'
                    }`}>
                      {grupo.label}
                    </span>
                    <div className="flex-1 h-px bg-[#323238]" />
                  </div>
                  {grupo.items.map((d) => {
                    const dt = new Date(d.date + 'T12:00:00')
                    return (
                      <div key={d.date}
                        className={`px-3 py-2 flex items-center gap-2 border-b border-[#323238]/40 ${
                          d.is_start ? 'bg-[#2563eb]/15' : 'hover:bg-[#1e1e22]'
                        }`}>
                        <span className="text-white font-medium text-xs w-20 shrink-0">{fmtDateBR(d.date)}</span>
                        <span className="text-gray-500 text-[10px] w-8 shrink-0">{WEEKDAYS[dt.getDay()]}</span>
                        <TipoBotao item={d} onToggle={(_, v) => toggleTraining(d.date, v)} size="sm" />
                      </div>
                    )
                  })}
                </section>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 pt-2 border-t border-[#323238]">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Encontros</span>
                <span className="ml-2 text-white text-sm font-bold">{numEncontros}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Trocas</span>
                <span className="ml-2 text-white text-sm font-bold">{numTrocas}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Semanas</span>
                <span className="ml-2 text-white text-sm font-bold">{totalSemanas}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
