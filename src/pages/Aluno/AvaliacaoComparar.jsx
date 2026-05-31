import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, TrendingUp, Activity, Layers, PieChart, Percent, Ruler, BarChart3,
  Camera, Share2, Images,
} from 'lucide-react'
import { Spinner } from '../../components/ui'
import {
  GlassCard, SectionHeader, SemaphoreBar, Collapsible, EvolutionChart, Photo, ActionButton,
} from '../../components/aluno'
import { compararAvaliacoesAluno } from '../../api/avaliacoesAluno'
import useErrorModal from '../../hooks/useErrorModal'

// Cor do texto conforme a classe semântica do backend (good/bad/warn/neutral/low).
const semColor = (cls) => ({
  good: 'text-[#22C55E]',
  bad: 'text-[#F87171]',
  warn: 'text-[#F59E0B]',
  low: 'text-[#94A3B8]',
  neutral: 'text-[var(--sf-text-soft)]',
}[cls] || 'text-[var(--sf-text-soft)]')

// ─── Hero KPI ───────────────────────────────────────────────────────────────
function KpiCard({ kpi }) {
  return (
    <GlassCard as="div" className="px-4 py-3.5">
      <p className="text-[var(--sf-text-soft)] text-[10px] uppercase tracking-widest font-bold truncate">{kpi.label}</p>
      <p className="text-white text-2xl font-bold mt-1 leading-none">{kpi.value}</p>
      {kpi.delta && (
        <p className={`text-[11px] font-bold mt-1.5 ${semColor(kpi.delta_class)}`}>{kpi.delta}</p>
      )}
      {kpi.status && (
        <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${semColor(kpi.status_class)}`}>{kpi.status}</p>
      )}
    </GlassCard>
  )
}

// ─── Tabela de evolução / medidas ─────────────────────────────────────────────
function MatrixTable({ headers, rows, showDelta = false }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 bg-[var(--sf-bg)] z-10 text-left text-[10px] font-bold text-[var(--sf-text-soft)] uppercase tracking-wider px-2 py-2 min-w-[96px]" />
            {headers.map((h, i) => (
              <th
                key={i}
                className={`text-center text-[10px] font-bold uppercase tracking-wider px-2 py-2 min-w-[64px] ${h.is_last ? 'text-[#60A5FA]' : 'text-[var(--sf-text-soft)]'}`}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--sf-border)]">
          {rows.map((row, ri) => (
            <tr key={ri}>
              <td className="sticky left-0 bg-[var(--sf-bg)] z-10 text-[var(--sf-text-muted)] text-xs font-medium px-2 py-2.5 align-middle">
                {row.label}
              </td>
              {row.cells.map((cell, ci) => (
                <td key={ci} className={`text-center px-2 py-2.5 ${cell.is_last ? 'bg-[#2563EB]/[0.08]' : ''}`}>
                  <span className={`text-sm font-bold ${cell.is_last ? 'text-white' : 'text-[var(--sf-text-muted)]'}`}>{cell.value}</span>
                  {showDelta && cell.delta && (
                    <span className={`block text-[10px] font-semibold ${semColor(cell.delta_class)}`}>{cell.delta}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Sparkline de peso (pontos x,y já em 0–100 vindos do backend) ─────────────
function WeightSparkline({ sparkline }) {
  const points = sparkline?.points || []
  if (points.length < 2) return null
  const poly = points.map(p => `${p.x},${p.y}`).join(' ')
  return (
    <div className="relative w-full h-36">
      {/* Área do gráfico (deixa espaço em cima p/ valores e embaixo p/ meses) */}
      <div className="absolute left-3 right-3 top-7 bottom-7">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <polyline points={poly} fill="none" stroke="#3B82F6" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
        {points.map((p, i) => (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <div className="h-2.5 w-2.5 rounded-full bg-[#3B82F6] border-2 border-[var(--sf-bg)] shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            <span className="absolute left-1/2 -translate-x-1/2 bottom-4 text-[10px] font-bold text-white whitespace-nowrap">{p.value}</span>
          </div>
        ))}
      </div>
      {/* Meses no rodapé */}
      <div className="absolute left-3 right-3 bottom-0 h-6">
        {points.map((p, i) => (
          <span
            key={i}
            className="absolute -translate-x-1/2 text-[10px] font-semibold text-[var(--sf-text-soft)] whitespace-nowrap"
            style={{ left: `${p.x}%` }}
          >
            {p.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Matriz de fotos (pose × data) ────────────────────────────────────────────
function PhotoMatrix({ matrix, headers }) {
  const comFotos = matrix.filter(pose => pose.fotos.some(f => f.url))
  if (!comFotos.length) {
    return <p className="text-[var(--sf-text-soft)] text-xs text-center py-4">Sem fotos nestas avaliações.</p>
  }
  const cols = headers.length
  return (
    <div className="space-y-4">
      {comFotos.map(pose => (
        <div key={pose.field}>
          <p className="text-[#93C5FD] text-[11px] font-bold uppercase tracking-wider mb-2">{pose.label}</p>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
            {pose.fotos.map((f, i) => (
              <div key={i}>
                <Photo url={f.url} label={`${pose.label} · ${f.date_label}`} caption={f.date_label} />
                <p className="text-[var(--sf-text-soft)] text-[9px] text-center mt-1">{f.date_label}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Filtra tabelas de medida que estão totalmente vazias ("-").
const linhaPreenchida = (row) => row.cells.some(c => c.value && c.value !== '-')

const numBR = (n, dec = 1) => (n == null ? '-' : Number(n).toFixed(dec).replace('.', ','))

const temChart = (c) => !!(c?.datasets?.length && c?.labels?.length)

// Converte um chart {labels, datasets:[{name,values}]} numa tabela (linhas = datasets).
const chartParaTabela = (chart, sufixo = '') => {
  if (!temChart(chart)) return null
  const labels = chart.labels
  const lastIdx = labels.length - 1
  const tableHeaders = labels.map((l, i) => ({ label: l, is_last: i === lastIdx }))
  const rows = chart.datasets.map(ds => ({
    label: ds.name,
    cells: (ds.values || []).map((v, i) => ({
      value: v == null ? '-' : `${numBR(v)}${sufixo}`,
      is_last: i === lastIdx,
    })),
  }))
  return { headers: tableHeaders, rows }
}

export default function AvaliacaoComparar() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const names = searchParams.get('names') || ''
  const errorModal = useErrorModal()
  const errorModalRef = useRef(errorModal)
  useEffect(() => { errorModalRef.current = errorModal }, [errorModal])
  const fotosRef = useRef(null)

  const [data, setData] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [fotosAbertas, setFotosAbertas] = useState(false)

  useEffect(() => {
    let cancelado = false
    setCarregando(true)
    compararAvaliacoesAluno(names)
      .then(res => { if (!cancelado) setData(res) })
      .catch(err => !cancelado && errorModalRef.current.show(err, 'Comparação'))
      .finally(() => !cancelado && setCarregando(false))
    return () => { cancelado = true }
  }, [names])

  const compartilharWhatsApp = () => {
    if (!data) return
    const linhas = [
      `*${data.aluno?.nome || 'Avaliação'}*`,
      `${data.avaliacoes_count} avaliações · ${data.time_span_months} meses`,
      '',
      ...(data.hero_kpis || []).map(k => `${k.label}: ${k.value}${k.delta ? ` (${k.delta})` : ''}`),
    ].join('\n')
    window.open(`https://wa.me/?text=${encodeURIComponent(linhas)}`, '_blank', 'noopener')
  }

  const verFotos = () => {
    setFotosAbertas(true)
    setTimeout(() => fotosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  const headers = data?.evolucao_matrix?.headers || []
  const charts = data?.charts || {}
  const measures = data?.measure_tables || {}

  // Tabelas (números) derivadas — dobras, fórmulas de %gordura e grupos de medidas preenchidos.
  const dobrasRows = (measures.skinfolds?.rows || []).filter(linhaPreenchida)
  const formulaTabela = chartParaTabela(charts.skin_folds, '%')
  const medidasGrupos = ['trunk', 'arms', 'legs', 'others']
    .map(k => [k, measures[k]])
    .filter(([, tbl]) => tbl)
    .map(([k, tbl]) => [k, tbl, (tbl.rows || []).filter(linhaPreenchida)])
    .filter(([, , rows]) => rows.length > 0)

  return (
    <div className="pb-10 bg-[var(--sf-bg)] min-h-full">
      {errorModal.element}

      <div className="px-4 pt-4 pb-3 border-b border-[var(--sf-border)] bg-[var(--sf-bg)]/95 backdrop-blur-sm sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => navigate('/aluno/avaliacoes')}
          title="Voltar"
          className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-white border border-[var(--sf-border)] hover:border-[var(--sf-border-strong)] rounded-lg transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-white text-base font-bold flex-1">Comparação</h1>
      </div>

      {carregando ? (
        <div className="h-40 flex items-center justify-center"><Spinner /></div>
      ) : !data ? (
        <div className="px-4 pt-6">
          <GlassCard as="div" className="px-4 py-8 text-center">
            <p className="text-[var(--sf-text-muted)] text-sm">Não foi possível carregar a comparação.</p>
          </GlassCard>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-5">
          {/* Cabeçalho do aluno */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-white text-lg font-bold leading-tight truncate">{data.aluno?.nome}</h2>
              <p className="text-[var(--sf-text-muted)] text-xs mt-0.5">
                {data.avaliacoes_count} avaliações · {data.time_span_months} {data.time_span_months === 1 ? 'mês' : 'meses'}
                {headers.find(h => h.is_last)?.label ? ` · Última: ${headers.find(h => h.is_last).label}` : ''}
              </p>
            </div>
            {data.has_history && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border bg-[rgba(37,99,235,0.15)] border-[rgba(59,130,246,0.4)] text-[#60A5FA] shrink-0">
                <TrendingUp size={11} /> Evolução
              </span>
            )}
          </div>

          {/* Hero KPIs 2x2 */}
          <div className="grid grid-cols-2 gap-2.5">
            {(data.hero_kpis || []).map((k, i) => <KpiCard key={i} kpi={k} />)}
          </div>

          {/* Ações */}
          <div className="grid grid-cols-2 gap-2.5">
            <ActionButton variant="success" icon={Share2} onClick={compartilharWhatsApp}>WhatsApp</ActionButton>
            <ActionButton variant="ghost" icon={Images} onClick={verFotos}>Comparar fotos</ActionButton>
          </div>

          {/* Resumo da evolução */}
          {data.evolucao_matrix?.rows?.length > 0 && (
            <div>
              <SectionHeader icon={<BarChart3 size={15} />} label="Resumo da evolução" />
              <GlassCard as="div" className="px-3 py-3">
                <MatrixTable headers={headers} rows={data.evolucao_matrix.rows} showDelta />
              </GlassCard>
            </div>
          )}

          {/* Indicadores de saúde (recolhível) */}
          {data.health_indicators?.length > 0 && (
            <Collapsible icon={<Activity size={16} />} title="Indicadores de saúde" subtitle="IMC, WHR e WHtR" defaultOpen>
              <div className="divide-y divide-[var(--sf-border)] pt-1">
                {data.health_indicators.map((ind, i) => <SemaphoreBar key={i} indicator={ind} />)}
              </div>
            </Collapsible>
          )}

          {/* Sparkline de peso (recolhível) */}
          {data.weight_sparkline?.points?.length >= 2 && (
            <Collapsible icon={<TrendingUp size={16} />} title="Peso ao longo do tempo" subtitle={`mín ${data.weight_sparkline.min_label} · máx ${data.weight_sparkline.max_label}`} defaultOpen>
              <div className="pt-3 pb-3">
                <WeightSparkline sparkline={data.weight_sparkline} />
              </div>
            </Collapsible>
          )}

          {/* Detalhes da comparação (recolhíveis) — números em tabelas, gráficos só onde faz sentido */}
          <div>
            <SectionHeader icon={<PieChart size={15} />} label="Detalhes da comparação" />
            <div className="space-y-2.5">
              {/* 1. Composição corporal (gráfico) — peso já está no sparkline acima */}
              {temChart(charts.body_composition) && (
                <Collapsible icon={<PieChart size={16} />} title="Composição corporal" subtitle="Gordura e massa magra (kg)">
                  <div className="pt-3"><EvolutionChart chart={charts.body_composition} height={170} /></div>
                </Collapsible>
              )}

              {/* 2. Dobras cutâneas (números) */}
              {dobrasRows.length > 0 && (
                <Collapsible icon={<Layers size={16} />} title="Dobras cutâneas (mm)" subtitle="Valores por avaliação">
                  <div className="pt-3"><MatrixTable headers={headers} rows={dobrasRows} /></div>
                </Collapsible>
              )}

              {/* 3. Evolução em % (gráfico) */}
              {temChart(charts.body_composition_evo) && (
                <Collapsible icon={<Percent size={16} />} title="Evolução em %" subtitle="Gordura e massa muscular (%)">
                  <div className="pt-3"><EvolutionChart chart={charts.body_composition_evo} height={170} /></div>
                </Collapsible>
              )}

              {/* 4. % de gordura por fórmula (números) */}
              {formulaTabela?.rows?.length > 0 && (
                <Collapsible icon={<Percent size={16} />} title="% de gordura por fórmula" subtitle="Faulkner, Guedes, JP3, JP4, JP7">
                  <div className="pt-3"><MatrixTable headers={formulaTabela.headers} rows={formulaTabela.rows} /></div>
                </Collapsible>
              )}

              {/* 5. Medidas (números, tabelas) */}
              {medidasGrupos.length > 0 && (
                <Collapsible icon={<Ruler size={16} />} title="Medidas (cm)" subtitle="Tronco, braços, pernas e outras">
                  <div className="space-y-4 pt-3">
                    {medidasGrupos.map(([key, tbl, rows]) => (
                      <div key={key}>
                        <p className="text-[#93C5FD] text-[11px] font-bold uppercase tracking-wider mb-2">{tbl.label}</p>
                        <MatrixTable headers={headers} rows={rows} />
                      </div>
                    ))}
                  </div>
                </Collapsible>
              )}

              {/* 6. Histórico de indicadores (gráfico) */}
              {(temChart(charts.whr) || temChart(charts.whtr)) && (
                <Collapsible icon={<Activity size={16} />} title="Histórico de indicadores" subtitle="WHR e WHtR ao longo do tempo">
                  <div className="space-y-5 pt-3">
                    {temChart(charts.whr) && <EvolutionChart chart={charts.whr} height={160} />}
                    {temChart(charts.whtr) && <EvolutionChart chart={charts.whtr} height={160} />}
                  </div>
                </Collapsible>
              )}
            </div>
          </div>

          {/* Matriz de fotos (recolhível, controlada pelo botão "Comparar fotos") */}
          <div ref={fotosRef} className="scroll-mt-20">
            <Collapsible
              icon={<Camera size={16} />}
              title="Comparar fotos"
              subtitle="Mesma pose lado a lado por data"
              open={fotosAbertas}
              onOpenChange={setFotosAbertas}
            >
              <div className="pt-2">
                <PhotoMatrix matrix={data.photo_matrix || []} headers={headers} />
              </div>
            </Collapsible>
          </div>
        </div>
      )}
    </div>
  )
}
