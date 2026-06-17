import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, X, FileText, Flame, Target, BarChart2, ChevronRight } from 'lucide-react'
import {
  Button, FormGroup, Input, Select, Autocomplete, Modal, Spinner, EmptyState,
} from '../../components/ui'
import {
  listarModelosDieta, listarModelosFicha,
  buscarModeloDieta, buscarModeloFicha,
  aplicarModeloDieta, aplicarModeloFicha,
  CATEGORIAS_DIETA, CATEGORIAS_FICHA,
} from '../../api/modelos'
import { listarAlunos, buscarAluno } from '../../api/alunos'
import { criarDieta, dadosAntropometricosFromAluno } from '../../api/dietas'
import { criarFicha } from '../../api/fichas'
import { buscarSmart } from '../../utils/strings'

const todayYMD = () => new Date().toISOString().slice(0, 10)
const addDaysYMD = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const buscarAlunosFn = async (q) => {
  if (!q || q.length < 2) return []
  try {
    const res = await listarAlunos({ search: q, limit: 8 })
    return res.list
  } catch { return [] }
}

/**
 * Modal compartilhado pra criar uma nova Dieta ou Ficha a partir de um modelo.
 *
 * Props:
 *   tipo: 'dieta' | 'ficha'
 *   isOpen, onClose
 *   onCriada(novaId): callback após criação bem-sucedida
 */
export default function ModalEscolherModelo({ tipo, isOpen, onClose, onCriada }) {
  const [step, setStep] = useState(1) // 1: escolher modelo · 2: configurar destino
  const [modelos, setModelos] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [categoria, setCategoria] = useState('')
  const [modeloSelecionado, setModeloSelecionado] = useState(null)
  const [aluno, setAluno] = useState(null)
  const [dataInicio, setDataInicio] = useState(todayYMD())
  const [dataFim, setDataFim] = useState(addDaysYMD(30))
  const [criando, setCriando] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const categorias = tipo === 'dieta' ? CATEGORIAS_DIETA : CATEGORIAS_FICHA
  const listarFn = tipo === 'dieta' ? listarModelosDieta : listarModelosFicha
  const buscarFn = tipo === 'dieta' ? buscarModeloDieta : buscarModeloFicha

  const carregar = useCallback(async () => {
    if (!isOpen || step !== 1) return
    setLoading(true)
    try {
      // Lista pequena: filtro local com buscarSmart garante acento + coringa.
      const { list } = await listarFn({ categoria, limit: 100 })
      const filtrada = query ? list.filter(m => buscarSmart([m.titulo, m.descricao], query)) : list
      setModelos(filtrada)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [isOpen, step, query, categoria, listarFn])

  useEffect(() => { carregar() }, [carregar])

  // Reset quando o modal fechar
  useEffect(() => {
    if (!isOpen) {
      setStep(1)
      setModeloSelecionado(null)
      setAluno(null)
      setSearch('')
      setQuery('')
      setCategoria('')
      setDataInicio(todayYMD())
      setDataFim(addDaysYMD(30))
    }
  }, [isOpen])

  const handleSelecionar = (m) => {
    setModeloSelecionado(m)
    setStep(2)
  }

  const handleAplicar = async () => {
    if (!modeloSelecionado || !aluno) return
    setCriando(true)
    try {
      const modeloCompleto = await buscarFn(modeloSelecionado.name)
      const snapshot = JSON.parse(modeloCompleto.snapshot_json || '{}')

      let nova
      if (tipo === 'dieta') {
        let dadosAntropometricos = {}
        try {
          const alunoDoc = await buscarAluno(aluno.name)
          dadosAntropometricos = dadosAntropometricosFromAluno(alunoDoc)
        } catch {
          dadosAntropometricos = dadosAntropometricosFromAluno(aluno)
        }
        const payload = aplicarModeloDieta(snapshot, {
          aluno: aluno.name,
          nome_completo: aluno.nome_completo,
          date: dataInicio,
          final_date: dataFim,
          dadosAntropometricos,
        })
        nova = await criarDieta(payload)
      } else {
        const payload = aplicarModeloFicha(snapshot, {
          aluno: aluno.name,
          nome_completo: aluno.nome_completo,
          data_de_inicio: dataInicio,
          data_de_fim: dataFim,
        })
        nova = await criarFicha(payload)
      }

      onCriada(nova.name)
    } catch (e) {
      console.error(e)
      alert('Erro ao aplicar modelo: ' + (e?.message || 'desconhecido'))
    } finally {
      setCriando(false)
    }
  }

  if (!isOpen) return null

  // ── Step 2: configurar destino ────────────────────────────────────────────
  if (step === 2) {
    return (
      <Modal
        isOpen
        onClose={onClose}
        title="Aplicar modelo"
        subtitle={modeloSelecionado?.titulo}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setStep(1)}>Voltar</Button>
            <Button variant="primary" icon={Plus} onClick={handleAplicar} loading={criando} disabled={!aluno}>
              Criar {tipo === 'dieta' ? 'Dieta' : 'Ficha'}
            </Button>
          </>
        }
      >
        <div className="p-5 space-y-4">
          <FormGroup label="Aluno destino" required>
            {aluno ? (
              <div className="flex items-center justify-between h-10 px-3 rounded-lg bg-[#29292e] border border-[#2563eb]/40">
                <span className="text-white text-sm">{aluno.nome_completo}</span>
                <button onClick={() => setAluno(null)} className="text-gray-500 hover:text-red-400 transition-colors ml-2">
                  <X size={13} />
                </button>
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
                placeholder="Buscar aluno pelo nome…"
              />
            )}
          </FormGroup>
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Início">
              <input
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                className="w-full h-10 px-3 bg-[#29292e] border border-[#323238] text-white text-sm rounded-lg outline-none focus:border-[#2563eb]/60"
              />
            </FormGroup>
            <FormGroup label="Fim">
              <input
                type="date"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
                className="w-full h-10 px-3 bg-[#29292e] border border-[#323238] text-white text-sm rounded-lg outline-none focus:border-[#2563eb]/60"
              />
            </FormGroup>
          </div>
        </div>
      </Modal>
    )
  }

  // ── Step 1: escolher modelo ───────────────────────────────────────────────
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`A partir de modelo · ${tipo === 'dieta' ? 'Dieta' : 'Ficha'}`}
      subtitle="Selecione um modelo para usar como base"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        </>
      }
    >
      <div className="p-5 space-y-4">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 min-w-0">
            <Input
              value={search}
              onChange={setSearch}
              placeholder="Buscar por título…"
              icon={({ size }) => <Search size={size} />}
              onClear={search ? () => setSearch('') : undefined}
            />
          </div>
          <div className="w-full sm:w-52">
            <Select
              value={categoria}
              onChange={setCategoria}
              options={['', ...categorias].map(c => ({ value: c, label: c || 'Todas categorias' }))}
              placeholder="Todas categorias"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="border border-[#323238] rounded-lg max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="py-12 flex items-center justify-center">
              <Spinner size="md" />
            </div>
          ) : modelos.length === 0 ? (
            <div className="py-10 px-5">
              <EmptyState
                icon={FileText}
                title="Nenhum modelo encontrado"
                description={
                  query || categoria
                    ? 'Ajuste a busca ou os filtros.'
                    : `Abra uma ${tipo === 'dieta' ? 'dieta' : 'ficha'} e clique em "Salvar como modelo" para criar o primeiro.`
                }
              />
            </div>
          ) : (
            <div className="divide-y divide-[#323238]">
              {modelos.map((m) => (
                <button
                  key={m.name}
                  onClick={() => handleSelecionar(m)}
                  className="w-full text-left px-4 py-3 hover:bg-[#29292e] transition-colors flex items-center gap-3 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{m.titulo}</p>
                    {m.descricao && (
                      <p className="text-gray-500 text-xs mt-0.5 truncate">{m.descricao}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-xs">
                      {m.categoria && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded border border-[#323238] text-gray-400">
                          {m.categoria}
                        </span>
                      )}
                      {tipo === 'dieta' ? (
                        <>
                          {m.strategy_ref && (
                            <span className="text-gray-400 truncate">{m.strategy_ref}</span>
                          )}
                          {m.total_calories_ref != null && (
                            <span className="inline-flex items-center gap-1 text-orange-400">
                              <Flame size={11} />
                              {m.total_calories_ref} kcal
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          {m.objetivo_ref && (
                            <span className="inline-flex items-center gap-1 text-gray-400">
                              <Target size={11} /> {m.objetivo_ref}
                            </span>
                          )}
                          {m.nivel_ref && (
                            <span className="inline-flex items-center gap-1 text-gray-400">
                              <BarChart2 size={11} /> {m.nivel_ref}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-300 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
