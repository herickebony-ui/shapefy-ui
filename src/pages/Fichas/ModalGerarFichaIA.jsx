import { useState, useEffect } from 'react'
import { Sparkles, Search, X, ChevronRight, FileText, Bell } from 'lucide-react'
import { listarAlunos } from '../../api/alunos'
import { gerarFichaIA, gerarFichaIADeModelo } from '../../api/fichas'
import { listarModelosFicha } from '../../api/modelos'
import { Button, FormGroup, Autocomplete, Modal, Select, Input, Spinner, EmptyState } from '../../components/ui'
import useErrorModal from '../../hooks/useErrorModal'
import client from '../../api/client'
import { buscarSmart } from '../../utils/strings'

const DIAS = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo']

const OBJETIVOS_FALLBACK = [
  'Hipertrofia',
  'Emagrecimento',
  'Força',
  'Resistência',
  'Condicionamento',
  'Reabilitação',
  'Qualidade de Vida',
]

const buscarAlunosFn = async (q) => {
  if (q.length < 2) return []
  try {
    const res = await listarAlunos({ search: q, limit: 8 })
    return res.list
  } catch { return [] }
}

export default function ModalGerarFichaIA({ onClose, onCriada }) {
  const errorModal = useErrorModal()

  // ── Modo ──────────────────────────────────────────────────────────────────
  const [modo, setModo] = useState('zero') // 'zero' | 'modelo'

  // ── Compartilhado ─────────────────────────────────────────────────────────
  const [aluno, setAluno] = useState(null)
  const [observacoes, setObservacoes] = useState('')
  const [gerando, setGerando] = useState(false)
  const [enfileirado, setEnfileirado] = useState(false)

  // ── "Do zero" ─────────────────────────────────────────────────────────────
  const [objetivo, setObjetivo] = useState('')
  const [nivel, setNivel] = useState('')
  const [tipoCiclo, setTipoCiclo] = useState('')
  const [diasSemana, setDiasSemana] = useState(3)
  const [diasDisponiveis, setDiasDisponiveis] = useState([])
  const [focoMuscular, setFocoMuscular] = useState('')
  const [incluirAerobicos, setIncluirAerobicos] = useState(false)
  const [incluirAlongamentos, setIncluirAlongamentos] = useState(false)
  const [objetivosList, setObjetivosList] = useState(OBJETIVOS_FALLBACK)

  // ── "A partir de modelo" ──────────────────────────────────────────────────
  const [modeloSelecionado, setModeloSelecionado] = useState(null)
  const [searchModelo, setSearchModelo] = useState('')
  const [queryModelo, setQueryModelo] = useState('')
  const [modelosList, setModelosList] = useState([])
  const [loadingModelos, setLoadingModelos] = useState(false)

  // Carregar objetivos
  useEffect(() => {
    client.get('/api/resource/Objetivo Ficha', {
      params: {
        filters: JSON.stringify([['enabled', '=', 1]]),
        fields: JSON.stringify(['name']),
        limit: 100,
        order_by: 'name asc',
      },
    }).then(res => {
      const list = (res.data?.data || []).map(o => o.name)
      if (list.length > 0) setObjetivosList(list)
    }).catch(() => {})
  }, [])

  // Debounce busca de modelos
  useEffect(() => {
    const t = setTimeout(() => setQueryModelo(searchModelo), 300)
    return () => clearTimeout(t)
  }, [searchModelo])

  // Carregar modelos quando aba "A partir de modelo" está ativa
  useEffect(() => {
    if (modo !== 'modelo' || modeloSelecionado) return
    setLoadingModelos(true)
    listarModelosFicha({ limit: 100 })
      .then(({ list }) => setModelosList(list))
      .catch(() => {})
      .finally(() => setLoadingModelos(false))
  }, [modo, modeloSelecionado])

  const modelosFiltrados = queryModelo
    ? modelosList.filter(m => buscarSmart(m.titulo, queryModelo))
    : modelosList

  const toggleDia = (dia) => {
    setDiasDisponiveis(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    )
  }

  const podeCriar = modo === 'zero'
    ? aluno && objetivo && nivel && tipoCiclo && diasDisponiveis.length >= diasSemana
    : aluno && modeloSelecionado

  const handleGerar = async () => {
    if (!podeCriar) return
    setGerando(true)
    try {
      let res
      if (modo === 'zero') {
        res = await gerarFichaIA({
          aluno: aluno.name,
          objetivo,
          nivel,
          tipo_de_ciclo: tipoCiclo,
          dias_por_semana: diasSemana,
          dias_disponiveis: diasDisponiveis,
          foco_muscular: focoMuscular,
          incluir_aerobicos: incluirAerobicos ? 1 : 0,
          incluir_alongamentos: incluirAlongamentos ? 1 : 0,
          observacoes,
        })
      } else {
        res = await gerarFichaIADeModelo({
          modelo_name: modeloSelecionado.name,
          aluno: aluno.name,
          observacoes,
        })
      }
      setEnfileirado(true)
    } catch (err) {
      setGerando(false)
      errorModal.show(err, 'Gerar ficha com IA')
    }
  }

  return (<>
    {errorModal.element}
    <Modal
      isOpen
      onClose={onClose}
      title="Gerar Ficha com IA"
      size="lg"
      footer={
        enfileirado ? null : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={gerando}>Cancelar</Button>
            <Button
              variant="primary"
              icon={Sparkles}
              onClick={handleGerar}
              loading={gerando}
              disabled={!podeCriar || gerando}
            >
              {gerando ? 'Enviando...' : 'Gerar Ficha'}
            </Button>
          </>
        )
      }
    >
      {/* Tabs */}
      <div className="flex border-b border-[#323238]">
        {[
          { key: 'zero', label: 'Do zero' },
          { key: 'modelo', label: 'A partir de modelo' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setModo(key)}
            disabled={gerando}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              modo === key
                ? 'text-white border-[#2563eb]'
                : 'text-gray-400 hover:text-white border-transparent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-4">
        {enfileirado && (
          <div className="flex flex-col gap-3 bg-[#1e2a3a] border border-[#2563eb]/30 rounded-xl p-4 text-sm text-blue-300">
            <div className="flex items-center gap-2 font-medium">
              <Sparkles size={15} className="animate-pulse shrink-0" />
              Ficha sendo gerada pela IA...
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <Bell size={13} className="shrink-0" />
              Você receberá uma notificação no sininho quando estiver pronta. Pode fechar este modal.
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
          </div>
        )}
        {!enfileirado && gerando && (
          <div className="flex items-center gap-3 bg-[#1e2a3a] border border-[#2563eb]/30 rounded-lg p-3 text-sm text-blue-300">
            <Sparkles size={16} className="animate-pulse shrink-0" />
            Enviando para a IA...
          </div>
        )}

        {modo === 'modelo' ? (
          /* ── Aba: A partir de modelo ──────────────────────────────────── */
          <>
            <FormGroup label="Modelo" required>
              {modeloSelecionado ? (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#29292e] border border-[#2563eb]/40">
                  <div>
                    <p className="text-white text-sm font-medium">{modeloSelecionado.titulo}</p>
                    {(modeloSelecionado.objetivo_ref || modeloSelecionado.nivel_ref) && (
                      <p className="text-gray-400 text-xs mt-0.5">
                        {[modeloSelecionado.objetivo_ref, modeloSelecionado.nivel_ref].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => { setModeloSelecionado(null); setSearchModelo('') }}
                    className="text-gray-500 hover:text-red-400 transition-colors ml-3 shrink-0"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={searchModelo}
                    onChange={setSearchModelo}
                    placeholder="Buscar modelo..."
                    icon={({ size }) => <Search size={size} />}
                    onClear={searchModelo ? () => setSearchModelo('') : undefined}
                  />
                  <div className="border border-[#323238] rounded-lg max-h-[200px] overflow-y-auto">
                    {loadingModelos ? (
                      <div className="py-8 flex items-center justify-center">
                        <Spinner size="sm" />
                      </div>
                    ) : modelosFiltrados.length === 0 ? (
                      <div className="py-6 px-4">
                        <EmptyState
                          icon={FileText}
                          title="Nenhum modelo encontrado"
                          description={searchModelo ? 'Ajuste a busca.' : 'Crie modelos salvando fichas como modelo.'}
                        />
                      </div>
                    ) : (
                      <div className="divide-y divide-[#323238]">
                        {modelosFiltrados.map((m) => (
                          <button
                            key={m.name}
                            onClick={() => setModeloSelecionado(m)}
                            className="w-full text-left px-3 py-2.5 hover:bg-[#29292e] transition-colors flex items-center gap-2 group"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">{m.titulo}</p>
                              {(m.objetivo_ref || m.nivel_ref) && (
                                <p className="text-gray-500 text-xs mt-0.5">
                                  {[m.objetivo_ref, m.nivel_ref].filter(Boolean).join(' · ')}
                                </p>
                              )}
                            </div>
                            <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-300 shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </FormGroup>

            <FormGroup label="Aluno" required>
              {aluno ? (
                <div className="flex items-center justify-between h-10 px-3 rounded-lg bg-[#29292e] border border-[#2563eb]/40">
                  <span className="text-white text-sm">{aluno.nome_completo}</span>
                  <button onClick={() => setAluno(null)} className="text-gray-500 hover:text-red-400 transition-colors ml-2">×</button>
                </div>
              ) : (
                <Autocomplete
                  searchFn={buscarAlunosFn}
                  onSelect={(a) => setAluno(a)}
                  renderItem={(a) => (
                    <div>
                      <p className="font-medium text-sm text-white">{a.nome_completo}</p>
                      {a.email && <p className="text-gray-500 text-xs">{a.email}</p>}
                    </div>
                  )}
                  placeholder="Buscar aluno pelo nome..."
                />
              )}
            </FormGroup>

            <FormGroup label="Observações para a IA">
              <textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                placeholder="Ex: aumentar volume de pernas, trocar exercícios com barra por máquinas..."
                rows={3}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#323238] rounded-lg text-white text-sm outline-none focus:border-[#2563eb]/60 focus:ring-1 focus:ring-[#2563eb]/30 placeholder-gray-600 resize-none"
              />
            </FormGroup>
          </>
        ) : (
          /* ── Aba: Do zero ─────────────────────────────────────────────── */
          <>
            <FormGroup label="Aluno" required>
              {aluno ? (
                <div className="flex items-center justify-between h-10 px-3 rounded-lg bg-[#29292e] border border-[#2563eb]/40">
                  <span className="text-white text-sm">{aluno.nome_completo}</span>
                  <button onClick={() => setAluno(null)} className="text-gray-500 hover:text-red-400 transition-colors ml-2">×</button>
                </div>
              ) : (
                <Autocomplete
                  searchFn={buscarAlunosFn}
                  onSelect={(a) => setAluno(a)}
                  renderItem={(a) => (
                    <div>
                      <p className="font-medium text-sm text-white">{a.nome_completo}</p>
                      {a.email && <p className="text-gray-500 text-xs">{a.email}</p>}
                    </div>
                  )}
                  placeholder="Buscar aluno pelo nome..."
                />
              )}
            </FormGroup>

            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="Objetivo" required>
                <Select
                  value={objetivo}
                  onChange={setObjetivo}
                  placeholder="Selecionar..."
                  options={objetivosList.map(o => ({ value: o, label: o }))}
                />
              </FormGroup>

              <FormGroup label="Nível" required>
                <Select
                  value={nivel}
                  onChange={setNivel}
                  placeholder="Selecionar..."
                  options={[
                    { value: 'Iniciante', label: 'Iniciante' },
                    { value: 'Intermediário', label: 'Intermediário' },
                    { value: 'Avançado', label: 'Avançado' },
                  ]}
                />
              </FormGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="Tipo de Ciclo" required>
                <Select
                  value={tipoCiclo}
                  onChange={setTipoCiclo}
                  placeholder="Selecionar..."
                  options={[
                    { value: 'Macrociclo', label: 'Macrociclo' },
                    { value: 'Mesociclo', label: 'Mesociclo' },
                    { value: 'Microciclo', label: 'Microciclo' },
                  ]}
                />
              </FormGroup>

              <FormGroup label="Dias de treino/semana" required>
                <Select
                  value={String(diasSemana)}
                  onChange={(v) => setDiasSemana(Number(v))}
                  options={[2,3,4,5,6].map(n => ({ value: String(n), label: `${n} dias` }))}
                />
              </FormGroup>
            </div>

            <FormGroup label={`Dias disponíveis (selecione pelo menos ${diasSemana})`} required>
              <div className="flex flex-wrap gap-2 mt-1">
                {DIAS.map(dia => {
                  const ativo = diasDisponiveis.includes(dia)
                  return (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => toggleDia(dia)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                        ativo
                          ? 'bg-[#2563eb] border-[#2563eb] text-white'
                          : 'bg-[#1a1a1a] border-[#323238] text-gray-400 hover:border-[#2563eb]/50 hover:text-white'
                      }`}
                    >
                      {dia}
                    </button>
                  )
                })}
              </div>
            </FormGroup>

            <FormGroup label="Foco muscular prioritário">
              <input
                type="text"
                value={focoMuscular}
                onChange={e => setFocoMuscular(e.target.value)}
                placeholder="Ex: prioridade glúteo e posterior..."
                className="w-full h-10 px-3 bg-[#1a1a1a] border border-[#323238] rounded-lg text-white text-sm outline-none focus:border-[#2563eb]/60 focus:ring-1 focus:ring-[#2563eb]/30 placeholder-gray-600"
              />
            </FormGroup>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incluirAerobicos}
                  onChange={e => setIncluirAerobicos(e.target.checked)}
                  className="accent-[#2563eb] w-4 h-4"
                />
                <span className="text-sm text-gray-300">Incluir aeróbicos</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incluirAlongamentos}
                  onChange={e => setIncluirAlongamentos(e.target.checked)}
                  className="accent-[#2563eb] w-4 h-4"
                />
                <span className="text-sm text-gray-300">Incluir alongamentos</span>
              </label>
            </div>

            <FormGroup label="Observações para a IA">
              <textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                placeholder="Restrições, lesões, equipamentos disponíveis, preferências..."
                rows={3}
                className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#323238] rounded-lg text-white text-sm outline-none focus:border-[#2563eb]/60 focus:ring-1 focus:ring-[#2563eb]/30 placeholder-gray-600 resize-none"
              />
            </FormGroup>
          </>
        )}
      </div>
    </Modal>
  </>)
}
