import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, X, Link2, Search, Wand2, Trash2, Plus,
} from 'lucide-react'
import {
  FormModalSimples, FormGroup, Input, Select, Spinner,
} from '../../components/ui'
import {
  criarContrato, salvarContrato, sincronizarVinculos, sugerirParcelas,
} from '../../api/contratosAluno'
import { buscarPlano } from '../../api/planosShapefy'
import { listarAlunos, buscarAluno } from '../../api/alunos'
import { METODOS_PAGAMENTO, MODALIDADES, MODALIDADE_HINT, COLOR_DOT } from './constants'
import {
  addMonths, formatCurrency, formatDateBr, getTodayISO, normalizeDate, smartSearch,
} from './utils'

const FORM_VAZIO = {
  aluno: '',
  plano: '',
  variacao_idx: -1,
  rotulo_variacao: '',
  variacao_duracao_meses: 0,
  modalidade: 'A vista',
  metodo_pagamento: 'Pix',
  qtd_parcelas: 1,
  qtd_parcelas_aluna: 1,
  dia_vencimento_parcela: 5,
  valor_bruto_total: 0,
  valor_liquido_total: 0,
  data_pagamento_principal: '',
  data_inicio: '',
  data_fim: '',
  status_manual: '',
  observacoes: '',
  parcelas: [],
}

export default function ContratoFormModal({
  isOpen, mode = 'novo', contrato, planos = [], contratos = [], onClose, onSuccess,
}) {
  const editar = mode === 'editar' && !!contrato
  const [form, setForm] = useState(FORM_VAZIO)
  const [planoDetalhe, setPlanoDetalhe] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erroValidacao, setErroValidacao] = useState('')

  const [todosAlunos, setTodosAlunos] = useState([])
  const [alunoQuery, setAlunoQuery] = useState('')
  const [alunoNomeAtual, setAlunoNomeAtual] = useState('')
  const [alunoDropdownOpen, setAlunoDropdownOpen] = useState(false)

  const [vinculosOpen, setVinculosOpen] = useState(false)
  const [vinculadosAtuais, setVinculadosAtuais] = useState([])
  const [vinculosOriginais, setVinculosOriginais] = useState([])
  const [vincSearch, setVincSearch] = useState('')

  // controle do quick fill: "<planoId>__<variacaoIdx>"
  const [quickFillKey, setQuickFillKey] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setSalvando(false)
    setCarregando(true)
    setVinculosOpen(false)
    setVincSearch('')
    setAlunoDropdownOpen(false)
    setErroValidacao('')

    listarAlunos({ limit: 200 })
      .then((res) => setTodosAlunos(res.list || []))
      .catch(() => setTodosAlunos([]))

    if (editar && contrato) {
      setForm({
        aluno: contrato.aluno || '',
        plano: contrato.plano || '',
        variacao_idx: -1,
        rotulo_variacao: contrato.rotulo_variacao || '',
        variacao_duracao_meses: contrato.variacao_duracao_meses || 0,
        modalidade: contrato.modalidade || 'A vista',
        metodo_pagamento: contrato.metodo_pagamento || 'Pix',
        qtd_parcelas: contrato.qtd_parcelas || 1,
        qtd_parcelas_aluna: contrato.qtd_parcelas_aluna || contrato.qtd_parcelas || 1,
        dia_vencimento_parcela: contrato.dia_vencimento_parcela || 5,
        valor_bruto_total: contrato.valor_bruto_total || 0,
        valor_liquido_total: contrato.valor_liquido_total || 0,
        data_pagamento_principal: normalizeDate(contrato.data_pagamento_principal) || '',
        data_inicio: normalizeDate(contrato.data_inicio) || '',
        data_fim: normalizeDate(contrato.data_fim) || '',
        status_manual: contrato.status_manual || '',
        observacoes: contrato.observacoes || '',
        parcelas: [],
      })
      setAlunoNomeAtual(contrato.nome_aluno_snapshot || contrato.aluno || '')
    } else {
      setForm({ ...FORM_VAZIO, data_pagamento_principal: getTodayISO() })
      setAlunoNomeAtual('')
      setVinculosOriginais([])
      setVinculadosAtuais([])
      setQuickFillKey('')
    }
    setCarregando(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editar, contrato])

  // Quando o aluno selecionado muda (em qualquer modo), buscar os vínculos
  // existentes dele direto do backend pra refletir bidirecionalidade.
  useEffect(() => {
    if (!isOpen || !form.aluno) {
      if (!form.aluno) {
        setVinculosOriginais([])
        setVinculadosAtuais([])
      }
      return
    }
    let cancel = false
    buscarAluno(form.aluno)
      .then((doc) => {
        if (cancel) return
        const vinc = (doc?.vinculos_alunos || []).map((v) => v.aluno_vinculado).filter(Boolean)
        setVinculosOriginais(vinc)
      })
      .catch(() => {})
    return () => { cancel = true }
  }, [isOpen, form.aluno])

  // Hidrata vinculados com nomes a partir de todosAlunos
  useEffect(() => {
    if (!todosAlunos.length || !vinculosOriginais.length) {
      setVinculadosAtuais([])
      return
    }
    const list = vinculosOriginais
      .map((id) => todosAlunos.find((a) => a.name === id))
      .filter(Boolean)
      .map((a) => ({ id: a.name, nome: a.nome_completo }))
    setVinculadosAtuais(list)
  }, [todosAlunos, vinculosOriginais])

  // Aviso "aluna já tem contrato vigente" — só em modo "novo" + aluno selecionado
  const contratoVigenteDoAluno = useMemo(() => {
    if (editar) return null
    if (!form?.aluno) return null
    const hoje = getTodayISO()
    return contratos.find((c) => {
      if (c.aluno !== form.aluno) return false
      if (c.status_manual === 'Pausado') return false
      const fim = normalizeDate(c.data_fim)
      const inicio = normalizeDate(c.data_inicio)
      return inicio && fim && inicio <= hoje && hoje <= fim
    }) || null
  }, [editar, form?.aluno, contratos])

  // Carrega plano selecionado
  useEffect(() => {
    if (!form.plano) { setPlanoDetalhe(null); return }
    let cancel = false
    buscarPlano(form.plano)
      .then((p) => { if (!cancel) setPlanoDetalhe(p) })
      .catch(() => { if (!cancel) setPlanoDetalhe(null) })
    return () => { cancel = true }
  }, [form.plano])

  // Lista de planos+variações pro quick fill
  const quickFillOptions = useMemo(() => {
    const opts = [{ value: '', label: '— Selecione plano + duração —' }]
    planos.forEach((p) => {
      const variacoes = (p._variacoes_cache || []) // se tivermos cache
      // sem cache, deixamos label só com o plano e variação aparece ao escolher
      if (!variacoes.length) {
        opts.push({ value: `${p.name}__-1`, label: `${p.nome_plano || p.name} — escolher duração depois` })
      }
    })
    return opts
  }, [planos])

  const planoOptions = [
    { value: '', label: '-- Selecione plano --' },
    ...planos.map((p) => ({ value: p.name, label: p.nome_plano || p.name })),
  ]

  const variacoes = planoDetalhe?.variacoes || []

  const aplicarVariacao = useCallback((variacaoIdx) => {
    if (!planoDetalhe) return
    const v = planoDetalhe.variacoes?.[variacaoIdx]
    if (!v) return
    const meses = v.duracao_meses || 0
    setForm((f) => {
      const aVista = f.modalidade === 'A vista'
      const data_fim = f.data_inicio && meses ? addMonths(f.data_inicio, meses) : f.data_fim
      const valor_liquido = aVista ? v.valor_liquido_a_vista : (v.valor_liquido_a_prazo || v.valor_liquido_a_vista)
      const valor_bruto = aVista ? v.valor_bruto_a_vista : (v.valor_bruto_a_prazo || v.valor_bruto_a_vista)
      return {
        ...f,
        variacao_idx: variacaoIdx,
        rotulo_variacao: v.rotulo || '',
        variacao_duracao_meses: meses,
        valor_bruto_total: valor_bruto,
        valor_liquido_total: valor_liquido,
        data_fim,
        qtd_parcelas: aVista ? 1 : Math.max(1, meses),
        qtd_parcelas_aluna: aVista ? 1 : Math.max(1, meses),
        parcelas: [],
      }
    })
  }, [planoDetalhe])

  const aplicarModalidade = useCallback((mod) => {
    setForm((f) => {
      const variacao = planoDetalhe?.variacoes?.[f.variacao_idx]
      const aVista = mod === 'A vista'
      if (!variacao) {
        return {
          ...f,
          modalidade: mod,
          qtd_parcelas: aVista ? 1 : Math.max(1, f.variacao_duracao_meses || 1),
          parcelas: [],
        }
      }
      return {
        ...f,
        modalidade: mod,
        valor_bruto_total: aVista ? variacao.valor_bruto_a_vista : (variacao.valor_bruto_a_prazo || variacao.valor_bruto_a_vista),
        valor_liquido_total: aVista ? variacao.valor_liquido_a_vista : (variacao.valor_liquido_a_prazo || variacao.valor_liquido_a_vista),
        qtd_parcelas: aVista ? 1 : Math.max(1, f.variacao_duracao_meses || 1),
        qtd_parcelas_aluna: aVista ? 1 : Math.max(1, f.variacao_duracao_meses || 1),
        parcelas: [],
      }
    })
  }, [planoDetalhe])

  const aplicarInicio = useCallback((val) => {
    setForm((f) => {
      const meses = f.variacao_duracao_meses
      const data_fim = val && meses ? addMonths(val, meses) : f.data_fim
      return { ...f, data_inicio: val, data_fim }
    })
  }, [])

  // Sugerir parcelas (Caminho A)
  const gerarSugestaoParcelas = async () => {
    if (form.modalidade !== 'Parcelado') return
    if (!form.qtd_parcelas || form.qtd_parcelas < 1) {
      alert('Informe a quantidade de parcelas.')
      return
    }
    if (!form.valor_liquido_total || form.valor_liquido_total <= 0) {
      alert('Informe o valor líquido total.')
      return
    }
    const dataBase = form.data_inicio || form.data_pagamento_principal || getTodayISO()
    try {
      const sugestao = await sugerirParcelas(
        form.qtd_parcelas,
        form.valor_liquido_total,
        dataBase,
        form.dia_vencimento_parcela || null,
      )
      const parcelas = (sugestao || []).map((p) => ({
        numero_parcela: p.numero_parcela,
        data_vencimento: normalizeDate(p.data_vencimento) || '',
        valor_parcela: parseFloat(p.valor_parcela) || 0,
        data_pagamento: '',
      }))
      setForm((f) => ({ ...f, parcelas }))
    } catch (e) {
      alert('Erro ao sugerir parcelas: ' + (e.response?.data?.exception || e.message))
    }
  }

  const updateParcela = (idx, patch) => {
    setForm((f) => ({
      ...f,
      parcelas: f.parcelas.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    }))
  }

  const adicionarParcela = () => {
    setForm((f) => {
      const ultima = f.parcelas[f.parcelas.length - 1]
      const proximoNum = (ultima?.numero_parcela || f.parcelas.length) + 1
      const proximaData = ultima?.data_vencimento
        ? addMonths(ultima.data_vencimento, 1)
        : (f.data_inicio || f.data_pagamento_principal || getTodayISO())
      return {
        ...f,
        qtd_parcelas: f.parcelas.length + 1,
        parcelas: [...f.parcelas, {
          numero_parcela: proximoNum,
          data_vencimento: proximaData,
          valor_parcela: 0,
          data_pagamento: '',
        }],
      }
    })
  }

  const removerParcela = (idx) => {
    setForm((f) => {
      const next = f.parcelas.filter((_, i) => i !== idx).map((p, i) => ({ ...p, numero_parcela: i + 1 }))
      return { ...f, parcelas: next, qtd_parcelas: next.length }
    })
  }

  // Soma das parcelas e validação
  const somaParcelas = useMemo(
    () => (form.parcelas || []).reduce((acc, p) => acc + (parseFloat(p.valor_parcela) || 0), 0),
    [form.parcelas]
  )

  const diferenca = (parseFloat(form.valor_liquido_total) || 0) - somaParcelas
  const somaBate = Math.abs(diferenca) < 0.01

  const validar = () => {
    if (!form.aluno) return 'Selecione um aluno.'
    if (!form.plano) return 'Selecione um plano.'
    if (!form.rotulo_variacao || !form.variacao_duracao_meses) return 'Selecione uma variação do plano.'
    if (!form.valor_liquido_total || form.valor_liquido_total <= 0) return 'Informe o valor líquido total.'
    if (!form.data_inicio && !form.data_pagamento_principal) {
      return 'Informe pelo menos a Data de início OU a Data de pagamento.'
    }
    if (form.data_inicio && form.data_fim && form.data_fim < form.data_inicio) {
      return 'Data fim não pode ser anterior à data início.'
    }
    if (form.modalidade === 'Parcelado') {
      if (!form.parcelas?.length) {
        return 'Gere ou adicione as parcelas antes de salvar.'
      }
      if (form.parcelas.length !== form.qtd_parcelas) {
        return 'Quantidade de parcelas não bate com qtd_parcelas.'
      }
      const semData = form.parcelas.find((p) => !p.data_vencimento)
      if (semData) return `Parcela ${semData.numero_parcela}: data de vencimento obrigatória.`
      const semValor = form.parcelas.find((p) => !p.valor_parcela || p.valor_parcela <= 0)
      if (semValor) return `Parcela ${semValor.numero_parcela}: valor obrigatório (>0).`
      if (!somaBate) return `Soma das parcelas (${formatCurrency(somaParcelas)}) não bate com o total (${formatCurrency(form.valor_liquido_total)}).`
    }
    return null
  }

  const submit = async () => {
    const err = validar()
    if (err) { setErroValidacao(err); return }
    setErroValidacao('')
    setSalvando(true)
    try {
      const planoSnapshot = planoDetalhe?.nome_plano || form.plano
      const payload = {
        aluno: form.aluno,
        plano: form.plano,
        nome_plano_snapshot: planoSnapshot,
        rotulo_variacao: form.rotulo_variacao,
        variacao_duracao_meses: form.variacao_duracao_meses,
        modalidade: form.modalidade,
        metodo_pagamento: form.metodo_pagamento,
        qtd_parcelas: form.qtd_parcelas,
        qtd_parcelas_aluna: form.qtd_parcelas_aluna,
        valor_bruto_total: form.valor_bruto_total,
        valor_liquido_total: form.valor_liquido_total,
        data_pagamento_principal: form.data_pagamento_principal || null,
        data_inicio: form.data_inicio || null,
        data_fim: form.data_fim || null,
        status_manual: form.status_manual || '',
        observacoes: form.observacoes || '',
      }
      if (form.modalidade === 'Parcelado') {
        payload.dia_vencimento_parcela = form.dia_vencimento_parcela
        payload.parcelas = form.parcelas.map((p) => ({
          numero_parcela: p.numero_parcela,
          data_vencimento: p.data_vencimento,
          valor_parcela: p.valor_parcela,
          ...(p.data_pagamento ? { data_pagamento: p.data_pagamento } : {}),
        }))
      }

      let contratoId
      if (editar && contrato?.name) {
        await salvarContrato(contrato.name, payload)
        contratoId = contrato.name
      } else {
        const res = await criarContrato(payload)
        contratoId = res?.name
      }

      // Vínculos
      const idsAtuais = vinculadosAtuais.map((v) => v.id)
      const mudouVinculos = !arraysIguais(idsAtuais, vinculosOriginais)
      if (mudouVinculos) {
        try {
          await sincronizarVinculos(form.aluno, idsAtuais)
        } catch (e) {
          console.error('Erro ao sincronizar vínculos:', e)
          alert('Contrato salvo, mas houve erro ao sincronizar vínculos: ' + (e.response?.data?.exception || e.message))
        }
      }

      onSuccess?.(contratoId)
      onClose()
    } catch (e) {
      setErroValidacao('Erro ao salvar contrato: ' + (e.response?.data?.exception || e.message))
    } finally {
      setSalvando(false)
    }
  }

  // Filtro autocomplete aluno
  const alunoCandidates = useMemo(() => {
    const q = (alunoQuery || '').trim()
    const list = todosAlunos
    if (!q) return list.slice(0, 30)
    return list.filter((s) => smartSearch(s.nome_completo, q)).slice(0, 30)
  }, [todosAlunos, alunoQuery])

  if (!isOpen) return null

  return (
    <FormModalSimples
      isOpen={isOpen}
      onClose={onClose}
      title={editar ? `Editar contrato ${contrato?.name || ''}` : 'Novo lançamento'}
      subtitle={editar && !contrato?.data_inicio ? 'Contrato pago e não iniciado — preencha "Data início" para ativar' : undefined}
      size="xl"
      loading={salvando}
      onSubmit={submit}
      submitLabel={editar ? 'Salvar alterações' : 'Criar contrato'}
      quickFill={
        !editar ? (
          <QuickFill
            planoOptions={planoOptions}
            planoSelecionado={form.plano}
            onSelectPlano={(planoId) => setForm((f) => ({ ...f, plano: planoId, variacao_idx: -1 }))}
            variacoes={variacoes}
            variacaoIdx={form.variacao_idx}
            onSelectVariacao={aplicarVariacao}
          />
        ) : null
      }
    >
      {carregando ? (
        <div className="flex items-center justify-center py-16"><Spinner /></div>
      ) : (
        <>
          {editar && (
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-3 py-2 flex items-start gap-2">
              <AlertTriangle size={14} className="text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-yellow-300 text-[11px]">
                Editar o contrato <strong>não regenera parcelas</strong>. Para alterar parcelas, use a tabela abaixo (em Parcelado) ou abra o detalhe do contrato.
              </p>
            </div>
          )}

          {/* Aluno */}
          <FormGroup label="Aluno" required>
            {editar ? (
              <div className="h-10 px-3 inline-flex items-center w-full bg-[#1a1a1a] border border-[#323238] rounded-lg text-gray-400 text-sm">
                {alunoNomeAtual} <span className="ml-2 text-gray-600 text-[10px]">(não editável)</span>
              </div>
            ) : (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input
                  value={alunoQuery}
                  onChange={(e) => { setAlunoQuery(e.target.value); setAlunoDropdownOpen(true) }}
                  onFocus={() => setAlunoDropdownOpen(true)}
                  placeholder="Digite o nome do aluno..."
                  className="w-full h-10 pl-9 pr-3 bg-[#1a1a1a] border border-[#323238] text-white rounded-lg text-sm outline-none focus:border-[#2563eb]/60 placeholder-gray-600"
                />
                {alunoDropdownOpen && alunoQuery && (
                  <>
                    <div className="fixed inset-0 z-40" onMouseDown={() => setAlunoDropdownOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#222226] border border-[#323238] rounded-lg shadow-xl max-h-64 overflow-y-auto">
                      {alunoCandidates.length === 0 ? (
                        <div className="p-3 text-xs text-gray-500 text-center">Nenhum aluno encontrado.</div>
                      ) : (
                        alunoCandidates.map((s) => (
                          <button
                            key={s.name}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              setForm((f) => ({ ...f, aluno: s.name }))
                              setAlunoQuery(s.nome_completo || '')
                              setAlunoDropdownOpen(false)
                              setAlunoNomeAtual(s.nome_completo || '')
                            }}
                            className="w-full text-left p-3 border-b border-[#323238] last:border-0 hover:bg-[#323238] transition-colors"
                          >
                            <div className="text-white font-semibold text-sm">{s.nome_completo}</div>
                            {s.telefone && <div className="text-[10px] text-gray-500">{s.telefone}</div>}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
                {form.aluno && !alunoDropdownOpen && (
                  <div className="text-[10px] text-green-400 mt-1">✓ {alunoNomeAtual}</div>
                )}
              </div>
            )}
          </FormGroup>

          {/* Plano (readonly só em modo edição) */}
          {editar && (
            <FormGroup label="Plano">
              <div className="h-10 px-3 inline-flex items-center w-full bg-[#1a1a1a] border border-[#323238] rounded-lg text-gray-400 text-sm">
                {form.plano}
                {form.rotulo_variacao && (
                  <span className="ml-2 text-gray-500">· {form.rotulo_variacao} ({form.variacao_duracao_meses}m)</span>
                )}
                <span className="ml-auto text-gray-600 text-[10px]">não editável</span>
              </div>
            </FormGroup>
          )}

          {/* Modalidade + Método + Pausar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormGroup label="Modalidade" required hint={MODALIDADE_HINT[form.modalidade]}>
              <Select
                value={form.modalidade}
                onChange={aplicarModalidade}
                options={MODALIDADES.map((m) => ({ value: m, label: m }))}
              />
            </FormGroup>
            <FormGroup label="Método de pagamento">
              <Select
                value={form.metodo_pagamento}
                onChange={(v) => setForm((f) => ({ ...f, metodo_pagamento: v }))}
                options={METODOS_PAGAMENTO.map((m) => ({ value: m, label: m }))}
              />
            </FormGroup>
            <FormGroup label="Pausar contrato?">
              <Select
                value={form.status_manual}
                onChange={(v) => setForm((f) => ({ ...f, status_manual: v }))}
                options={[
                  { value: '', label: 'Ativo' },
                  { value: 'Pausado', label: 'Pausado' },
                ]}
              />
            </FormGroup>
          </div>

          {/* Bloco valores */}
          <div className="grid grid-cols-2 gap-3 bg-[#222226] border border-[#323238] rounded-xl p-3">
            <FormGroup label="Cliente paga (bruto)">
              <Input
                type="number"
                value={form.valor_bruto_total}
                onChange={(v) => setForm((f) => ({ ...f, valor_bruto_total: parseFloat(v) || 0 }))}
              />
            </FormGroup>
            <FormGroup label="Você recebe (líquido)" required>
              <Input
                type="number"
                value={form.valor_liquido_total}
                onChange={(v) => setForm((f) => ({ ...f, valor_liquido_total: parseFloat(v) || 0 }))}
              />
            </FormGroup>
          </div>

          {/* Datas: pagamento + início + fim */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormGroup label="Data de pagamento" hint="Quando a aluna pagou">
              <Input
                type="date"
                value={form.data_pagamento_principal}
                onChange={(v) => setForm((f) => ({ ...f, data_pagamento_principal: v }))}
              />
            </FormGroup>
            <FormGroup label="Data de início" hint="Vazio = pago e não iniciado">
              <Input
                type="date"
                value={form.data_inicio}
                onChange={aplicarInicio}
              />
            </FormGroup>
            <FormGroup label="Data fim" hint={form.variacao_duracao_meses ? `Auto: início + ${form.variacao_duracao_meses}m` : ''}>
              <Input
                type="date"
                value={form.data_fim}
                onChange={(v) => setForm((f) => ({ ...f, data_fim: v }))}
              />
            </FormGroup>
          </div>

          {/* Tabela de parcelas (só Parcelado) */}
          {form.modalidade === 'Parcelado' && (
            <ParcelasEditor
              form={form}
              setForm={setForm}
              somaParcelas={somaParcelas}
              somaBate={somaBate}
              diferenca={diferenca}
              onSugerir={gerarSugestaoParcelas}
              onAdd={adicionarParcela}
              onRemove={removerParcela}
              onUpdate={updateParcela}
            />
          )}

          {/* Observações */}
          <FormGroup label="Observações">
            <Input
              multiline
              rows={2}
              value={form.observacoes}
              onChange={(v) => setForm((f) => ({ ...f, observacoes: v }))}
            />
          </FormGroup>

          {/* Vínculos */}
          {form.aluno && (
            <VinculosPanel
              alunoBaseId={form.aluno}
              vinculados={vinculadosAtuais}
              setVinculados={setVinculadosAtuais}
              todosAlunos={todosAlunos}
              vincSearch={vincSearch}
              setVincSearch={setVincSearch}
              vinculosOpen={vinculosOpen}
              setVinculosOpen={setVinculosOpen}
            />
          )}

          {contratoVigenteDoAluno && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2 text-yellow-200 text-xs flex items-start gap-2">
              <AlertTriangle size={14} className="text-yellow-400 mt-0.5 shrink-0" />
              <div>
                Esta aluna já tem um contrato vigente
                {' ('}
                <span className="font-mono text-yellow-300">{contratoVigenteDoAluno.name}</span>
                {' · '}
                {contratoVigenteDoAluno.nome_plano_snapshot || contratoVigenteDoAluno.plano}
                {' · vence '}
                {formatDateBr(contratoVigenteDoAluno.data_fim)}
                {'). '}
                Confirme se realmente quer criar um novo.
              </div>
            </div>
          )}

          {erroValidacao && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-red-300 text-xs">
              ⚠ {erroValidacao}
            </div>
          )}
        </>
      )}
    </FormModalSimples>
  )
}

function QuickFill({ planoOptions, planoSelecionado, onSelectPlano, variacoes, variacaoIdx, onSelectVariacao }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      <Select
        value={planoSelecionado}
        onChange={onSelectPlano}
        options={planoOptions}
        placeholder="Plano"
      />
      <select
        value={variacaoIdx}
        onChange={(e) => onSelectVariacao(parseInt(e.target.value))}
        disabled={!variacoes?.length}
        className="w-full h-10 px-3 bg-[#1a1a1a] border border-[#323238] text-white rounded-lg text-sm outline-none focus:border-[#2563eb]/60 disabled:opacity-50"
      >
        <option value={-1}>{variacoes?.length ? '-- Variação --' : 'Escolha um plano primeiro'}</option>
        {variacoes?.map((v, idx) => (
          <option key={idx} value={idx}>{v.rotulo} ({v.duracao_meses} meses)</option>
        ))}
      </select>
    </div>
  )
}

function ParcelasEditor({ form, somaParcelas, somaBate, diferenca, onSugerir, onAdd, onRemove, onUpdate }) {
  return (
    <div className="border border-[#323238] rounded-xl bg-[#1a1a1a] p-3 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
          Parcelas (lançamento manual)
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSugerir}
            title="Preenche todas as parcelas dividindo o valor total e distribuindo as datas mês a mês"
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-[#2563eb]/30 text-[#2563eb] text-[11px] font-bold hover:bg-[#2563eb]/10 transition-colors"
          >
            <Wand2 size={12} /> Sugerir parcelas
          </button>
          <button
            type="button"
            onClick={onAdd}
            title="Adiciona uma parcela vazia ao final pra você preencher manualmente"
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-[#323238] text-gray-400 hover:text-white text-[11px] font-bold transition-colors"
          >
            <Plus size={12} /> Parcela manual
          </button>
        </div>
      </div>

      {!form.parcelas.length ? (
        <p className="text-gray-500 text-xs italic">
          Clique em <strong>Sugerir</strong> pra preencher rapidamente, ou <strong>Linha</strong> pra adicionar manualmente.
        </p>
      ) : (
        <div className="border border-[#323238] rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-[#111113] border-b border-[#323238]">
              <tr>
                <th className="px-2 py-1.5 text-left text-[10px] uppercase tracking-wider text-gray-500 w-10">#</th>
                <th className="px-2 py-1.5 text-left text-[10px] uppercase tracking-wider text-gray-500">Vencimento</th>
                <th className="px-2 py-1.5 text-right text-[10px] uppercase tracking-wider text-gray-500">Valor</th>
                <th className="px-2 py-1.5 text-left text-[10px] uppercase tracking-wider text-gray-500">Pago em</th>
                <th className="px-2 py-1.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {form.parcelas.map((p, idx) => (
                <tr key={idx} className={`border-b border-[#323238] last:border-0 ${idx % 2 ? 'bg-[#1e1e22]' : 'bg-[#1a1a1a]'}`}>
                  <td className="px-2 py-1 text-gray-400 font-bold">{p.numero_parcela}</td>
                  <td className="px-2 py-1">
                    <input
                      type="date"
                      value={p.data_vencimento}
                      onChange={(e) => onUpdate(idx, { data_vencimento: e.target.value })}
                      className="w-full h-7 px-2 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-[#2563eb]/60"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      step="0.01"
                      value={p.valor_parcela}
                      onChange={(e) => onUpdate(idx, { valor_parcela: parseFloat(e.target.value) || 0 })}
                      className="w-full h-7 px-2 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-[#2563eb]/60 text-right font-mono"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="date"
                      value={p.data_pagamento || ''}
                      onChange={(e) => onUpdate(idx, { data_pagamento: e.target.value })}
                      className="w-full h-7 px-2 bg-transparent border border-transparent hover:border-[#323238] focus:border-[#2563eb]/60 text-white rounded text-xs outline-none transition-colors"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <button
                      type="button"
                      onClick={() => onRemove(idx)}
                      title="Remover"
                      className="h-7 w-7 inline-flex items-center justify-center text-gray-500 hover:text-white border border-[#323238] hover:border-[#2563eb] rounded-lg transition-colors"
                    >
                      <Trash2 size={11} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Validação visual da soma */}
      {form.parcelas.length > 0 && (
        <div className={`flex items-center justify-between text-[11px] rounded-lg border px-3 py-2 ${
          somaBate
            ? 'bg-green-500/5 border-green-500/30 text-green-400'
            : 'bg-yellow-500/5 border-yellow-500/30 text-yellow-400'
        }`}>
          <span>
            Soma das parcelas: <strong>{formatCurrency(somaParcelas)}</strong>
          </span>
          {somaBate ? (
            <span className="font-bold">✓ Soma confere</span>
          ) : (
            <span className="font-bold">
              Diferença de {formatCurrency(diferenca)} pro total ({formatCurrency(form.valor_liquido_total)})
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function VinculosPanel({
  alunoBaseId, vinculados, setVinculados, todosAlunos, vincSearch, setVincSearch, vinculosOpen, setVinculosOpen,
}) {
  const candidatos = useMemo(() => {
    const q = (vincSearch || '').trim()
    if (!q) return []
    const ids = new Set(vinculados.map((v) => v.id))
    return todosAlunos
      .filter((a) => a.name !== alunoBaseId && !ids.has(a.name) && smartSearch(a.nome_completo, q))
      .slice(0, 20)
  }, [todosAlunos, alunoBaseId, vinculados, vincSearch])

  return (
    <div
      className={`rounded-xl border px-3 py-2 transition-colors ${
        vinculados.length
          ? 'bg-pink-500/5 border-pink-500/30'
          : 'bg-[#1a1a1a] border-[#323238]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 inline-flex items-center gap-1 ${vinculados.length ? 'text-pink-400' : 'text-gray-500'}`}>
            <Link2 size={11} /> Vínculos (casal/grupo)
          </div>
          <div className="text-xs text-white truncate">
            {vinculados.length
              ? <>Com: <span className="text-gray-300">{vinculados.map((v) => v.nome).join(', ')}</span></>
              : <span className="text-gray-500">Nenhum vínculo</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setVinculosOpen((o) => !o); setVincSearch('') }}
          className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
            vinculados.length
              ? 'bg-pink-500/10 border-pink-500/30 text-pink-400 hover:bg-pink-500/20'
              : 'bg-transparent border-[#323238] text-gray-400 hover:text-white hover:bg-[#222226]'
          }`}
        >
          {vinculosOpen ? 'Fechar' : (vinculados.length ? 'Editar' : 'Adicionar')}
        </button>
      </div>

      {vinculosOpen && (
        <div className="mt-3 space-y-3 border-t border-[#323238] pt-3">
          <div className="flex flex-wrap gap-2">
            {vinculados.map((v) => (
              <div
                key={v.id}
                className="bg-[#222226] text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-2 border border-[#323238]"
              >
                <span className="max-w-[180px] truncate">{v.nome}</span>
                <button
                  type="button"
                  onClick={() => setVinculados((prev) => prev.filter((p) => p.id !== v.id))}
                  className="text-gray-500 hover:text-white"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {!vinculados.length && (
              <span className="text-xs text-gray-500 italic">Nenhum vínculo selecionado.</span>
            )}
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              value={vincSearch}
              onChange={(e) => setVincSearch(e.target.value)}
              placeholder="Buscar pessoa para vincular..."
              className="w-full h-10 pl-9 pr-3 bg-[#1a1a1a] border border-[#323238] text-white rounded-lg text-sm outline-none focus:border-[#2563eb]/60 placeholder-gray-600"
            />
            {vincSearch && (
              <div className="mt-2 max-h-44 overflow-y-auto border border-[#323238] rounded-xl bg-[#222226]">
                {candidatos.length === 0 ? (
                  <div className="p-3 text-xs text-gray-500 text-center">Nenhum aluno encontrado.</div>
                ) : (
                  candidatos.map((a) => (
                    <button
                      key={a.name}
                      type="button"
                      onClick={() => {
                        setVinculados((prev) => [...prev, { id: a.name, nome: a.nome_completo }])
                        setVincSearch('')
                      }}
                      className="w-full text-left p-3 border-b border-[#323238] last:border-0 hover:bg-[#323238] transition-colors"
                    >
                      <div className="text-white text-sm font-semibold">{a.nome_completo}</div>
                      {a.telefone && <div className="text-[10px] text-gray-500">{a.telefone}</div>}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function arraysIguais(a, b) {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((v, i) => v === sb[i])
}
