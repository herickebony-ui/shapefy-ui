import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, BarChart2, ToggleLeft, ToggleRight, Copy, Check, Trash2, Plus, FileText } from 'lucide-react'
import { buscarAluno, salvarAluno } from '../../api/alunos'
import { listarDietas } from '../../api/dietas'
import { listarFichas } from '../../api/fichas'
import { listarAnamneses, buscarAnamnese, salvarAnamnese, excluirAnamnese, listarFormularios, vincularAnamnese } from '../../api/anamneses'
import { listarAvaliacoesPorAluno } from '../../api/avaliacoes'
import {
  Button, Badge, Modal, Tabs, Spinner, EmptyState,
  FormGroup, Input, Select, Textarea,
} from '../../components/ui'
import ImagemInterativa from '../Feedbacks/ImagemInterativa'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

const fmtData = (d) => {
  if (!d) return '—'
  const [y, m, day] = String(d).split(' ')[0].split('-')
  return `${day}/${m}/${y}`
}

// Os arrays NÃO incluem 'Selecionar...' — o componente Select do DS já injeta
// o placeholder automaticamente quando value é vazio.
const FREQUENCIA_OPTS = [
  { value: 'Sedentário', label: 'Sedentário' },
  { value: 'Levemente Ativo', label: 'Levemente Ativo' },
  { value: 'Moderadamente Ativo', label: 'Moderadamente Ativo' },
  { value: 'Muito Ativo', label: 'Muito Ativo' },
  { value: 'Extremamente Ativo', label: 'Extremamente Ativo' },
]

const SEXO_OPTS = [
  { value: 'Masculino', label: 'Masculino' },
  { value: 'Feminino', label: 'Feminino' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SecaoPerfil({ titulo }) {
  return (
    <div className="flex items-center gap-3 pt-2 pb-1">
      <div className="flex-1 h-px bg-[#323238]" />
      <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest shrink-0">{titulo}</span>
      <div className="flex-1 h-px bg-[#323238]" />
    </div>
  )
}

function ToggleField({ label, descricao, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#323238]/50 last:border-0">
      <div>
        <p className="text-white text-xs font-medium">{label}</p>
        {descricao && <p className="text-gray-600 text-[10px] mt-0.5">{descricao}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
          value
            ? 'text-green-400 border-green-500/30 bg-green-500/10 hover:bg-green-500/20'
            : 'text-gray-500 border-[#323238] hover:border-gray-500'
        }`}
      >
        {value ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
        {value ? 'Ativo' : 'Inativo'}
      </button>
    </div>
  )
}

function LinkCadastroField({ preenchido, alunoId }) {
  const [copiado, setCopiado] = useState(false)
  const copiarLink = async () => {
    const url = `${FRAPPE_URL}/preencher_aluno?name=${alunoId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      alert(`Link gerado:\n${url}`)
    }
  }
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#323238]/50">
      <div>
        <p className="text-white text-xs font-medium">Link de cadastro</p>
        <p className="text-gray-600 text-[10px] mt-0.5">
          {preenchido ? 'Aluno já preencheu o próprio cadastro' : 'Aguardando o aluno preencher'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
          preenchido ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10'
        }`}>
          {preenchido ? 'Cadastrado' : 'Aguardando'}
        </span>
        {!preenchido && (
          <button
            onClick={copiarLink}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#323238] hover:border-gray-500 text-gray-400 hover:text-white text-xs font-bold transition-all"
          >
            {copiado ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copiado ? 'Copiado!' : 'Copiar link'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Tab Perfil ───────────────────────────────────────────────────────────────

function parseEndereco(raw) {
  return { cep: '', logradouro: raw || '', numero: '', bairro: '', cidade: '', uf: '' }
}

function formatarEndereco(address) {
  const partes = []
  if (address.logradouro) partes.push(address.logradouro)
  if (address.numero) partes.push(address.numero)
  if (address.bairro) partes.push(address.bairro)
  if (address.cidade) partes.push(address.cidade)
  if (address.uf) partes.push(address.uf)
  if (address.cep) partes.push(`CEP ${address.cep}`)
  return partes.join(', ')
}

function TabPerfil({ aluno: inicial, alunoId }) {
  const [form, setForm] = useState({
    nome_completo: inicial.nome_completo || '',
    email: inicial.email || '',
    telefone: inicial.telefone || '',
    instagram: inicial.instagram || '',
    senha_de_acesso: inicial.senha_de_acesso || '',
    cpf: inicial.cpf || '',
    'profissão': inicial['profissão'] || '',
    objetivo: inicial.objetivo || '',
    sexo: inicial.sexo || '',
    age: inicial.age || '',
    height: inicial.height || '',
    weight: inicial.weight || '',
    frequencia_atividade: inicial.frequencia_atividade || '',
    doencas: inicial.doencas || '',
    medicamento: inicial.medicamento || '',
    orientacoes_globais: inicial.orientacoes_globais || '',
    enabled: !!inicial.enabled,
    link_de_cadastro: !!inicial.link_de_cadastro,
    dieta: !!inicial.dieta,
    treino: !!inicial.treino,
    ja_usou_o_aplicativo: !!inicial.ja_usou_o_aplicativo,
  })
  const [address, setAddress] = useState(() => parseEndereco(inicial['endereço']))
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  const set = (campo) => (val) => setForm(prev => ({ ...prev, [campo]: val }))
  const toggle = (campo) => (val) => setForm(prev => ({ ...prev, [campo]: val }))
  const setAddr = (campo) => (val) => setAddress(prev => ({ ...prev, [campo]: val }))

  const buscarCep = async (digits) => {
    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setAddress(prev => ({
          ...prev,
          logradouro: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          uf: data.uf || '',
        }))
      }
    } catch (e) { console.error(e) }
    finally { setBuscandoCep(false) }
  }

  const onCepChange = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 8)
    const masked = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
    setAddress(prev => ({ ...prev, cep: masked }))
    if (digits.length === 8) buscarCep(digits)
  }

  const salvar = async () => {
    setSalvando(true)
    try {
      const { ja_usou_o_aplicativo: _a, link_de_cadastro: _b, ...payload } = form
      await salvarAluno(alunoId, {
        ...payload,
        'endereço': formatarEndereco(address),
        enabled: form.enabled ? 1 : 0,
        dieta: form.dieta ? 1 : 0,
        treino: form.treino ? 1 : 0,
      })
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2000)
    } catch (e) {
      console.error(e)
      alert('Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-3">
      <SecaoPerfil titulo="Informações Básicas" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormGroup label="Nome completo"><Input value={form.nome_completo} onChange={set('nome_completo')} /></FormGroup>
        <FormGroup label="E-mail"><Input value={form.email} onChange={set('email')} type="email" /></FormGroup>
        <FormGroup label="Telefone"><Input value={form.telefone} onChange={set('telefone')} /></FormGroup>
        <FormGroup label="Instagram"><Input value={form.instagram} onChange={set('instagram')} placeholder="@usuario" /></FormGroup>
        <FormGroup label="Senha de Acesso"><Input value={form.senha_de_acesso} onChange={() => {}} disabled /></FormGroup>
      </div>

      <SecaoPerfil titulo="Dados Pessoais" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormGroup label="CPF"><Input value={form.cpf} onChange={set('cpf')} /></FormGroup>
        <FormGroup label="Profissão"><Input value={form['profissão']} onChange={set('profissão')} /></FormGroup>
      </div>
      <FormGroup label="Objetivo" hint="Resumo curto — visível no perfil">
        <Textarea value={form.objetivo} onChange={set('objetivo')} rows={2}
          placeholder="Ex: emagrecimento, hipertrofia, performance..." />
      </FormGroup>

      <SecaoPerfil titulo="Endereço" />
      <div className="grid grid-cols-2 gap-3">
        <FormGroup label="CEP">
          <div className="relative">
            <Input value={address.cep} onChange={onCepChange} placeholder="00000-000" />
            {buscandoCep && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Spinner size="sm" />
              </div>
            )}
          </div>
        </FormGroup>
        <FormGroup label="Logradouro">
          <Input value={address.logradouro} onChange={setAddr('logradouro')} placeholder="Rua, Av..." />
        </FormGroup>
        <FormGroup label="Número">
          <Input value={address.numero} onChange={setAddr('numero')} placeholder="Ex: 120" />
        </FormGroup>
        <FormGroup label="Bairro">
          <Input value={address.bairro} onChange={setAddr('bairro')} />
        </FormGroup>
      </div>
      <div className="grid grid-cols-[1fr_72px] gap-3">
        <FormGroup label="Cidade">
          <Input value={address.cidade} onChange={setAddr('cidade')} />
        </FormGroup>
        <FormGroup label="UF">
          <Input value={address.uf} onChange={v => setAddr('uf')(v.toUpperCase().slice(0, 2))} placeholder="BA" />
        </FormGroup>
      </div>

      <SecaoPerfil titulo="Corpo" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <FormGroup label="Sexo"><Select value={form.sexo} onChange={set('sexo')} options={SEXO_OPTS} /></FormGroup>
        <FormGroup label="Idade"><Input value={String(form.age)} onChange={v => set('age')(Number(v) || '')} type="number" /></FormGroup>
        <FormGroup label="Altura (cm)"><Input value={String(form.height)} onChange={v => set('height')(Number(v) || '')} type="number" /></FormGroup>
        <FormGroup label="Peso (kg)"><Input value={String(form.weight)} onChange={v => set('weight')(Number(v) || '')} type="number" /></FormGroup>
      </div>
      <FormGroup label="Frequência de atividade">
        <Select value={form.frequencia_atividade} onChange={set('frequencia_atividade')} options={FREQUENCIA_OPTS} />
      </FormGroup>

      <SecaoPerfil titulo="Saúde" />
      <FormGroup label="Doenças / Condições"><Textarea value={form.doencas} onChange={set('doencas')} rows={3} /></FormGroup>
      <FormGroup label="Medicamentos"><Textarea value={form.medicamento} onChange={set('medicamento')} rows={2} /></FormGroup>

      <SecaoPerfil titulo="Orientações Globais" />
      <FormGroup label="Exibidas nas fichas e dietas">
        <Textarea value={form.orientacoes_globais} onChange={set('orientacoes_globais')} rows={3} />
      </FormGroup>

      <SecaoPerfil titulo="Status e Configurações" />
      <div className="bg-[#1a1a1a] rounded-lg border border-[#323238] px-4 py-2">
        <ToggleField label="Aluno ativo" descricao="Desativar oculta o aluno das listagens" value={form.enabled} onChange={toggle('enabled')} />
        <LinkCadastroField preenchido={form.link_de_cadastro} alunoId={alunoId} />
        <ToggleField label="Possui dieta" value={form.dieta} onChange={toggle('dieta')} />
        <ToggleField label="Possui treino" value={form.treino} onChange={toggle('treino')} />
        <div className="flex items-center justify-between py-2.5">
          <div>
            <p className="text-white text-xs font-medium">Já usou o aplicativo</p>
            <p className="text-gray-600 text-[10px] mt-0.5">Definido automaticamente pelo sistema</p>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
            form.ja_usou_o_aplicativo ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-gray-500 border-[#323238]'
          }`}>
            {form.ja_usou_o_aplicativo ? 'Sim' : 'Não'}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {salvo && <span className="text-[10px] text-green-400 font-bold bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg">Salvo</span>}
        <Button variant="primary" size="sm" loading={salvando} onClick={salvar}>Salvar Perfil</Button>
      </div>
    </div>
  )
}

// ─── Tab Anamnese ─────────────────────────────────────────────────────────────

// Workaround: backend (vincular_anamnese) está duplicando perguntas_e_respostas.
// Se a primeira pergunta volta a aparecer mais à frente com mesmo título e tipo,
// trunca o array no ponto onde a duplicação começa.
function dedupePerguntas(perguntas) {
  if (!Array.isArray(perguntas) || perguntas.length < 2) return perguntas || []
  const primeira = perguntas[0]
  const idxRep = perguntas.findIndex((p, i) =>
    i > 0
    && p?.pergunta === primeira?.pergunta
    && p?.tipo === primeira?.tipo,
  )
  if (idxRep === -1) return perguntas
  return perguntas.slice(0, idxRep)
}

function AnamneseViewer({ anamnese: inicial, onVoltar }) {
  const [respostas, setRespostas] = useState(
    dedupePerguntas(inicial.perguntas_e_respostas || []).map(p => ({ ...p })),
  )
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [imgSrcs, setImgSrcs] = useState({})

  const setResposta = (idx, valor) => setRespostas(prev => prev.map((p, i) => i === idx ? { ...p, resposta: valor } : p))
  const handleRotate = (fileUrl, idx) => {
    setImgSrcs(prev => ({ ...prev, [`${inicial.name}_${idx}`]: `${FRAPPE_URL}${fileUrl}?v=${Date.now()}` }))
  }

  const salvar = async () => {
    setSalvando(true)
    try {
      await salvarAnamnese(inicial.name, respostas)
      setSalvo(true); setEditando(false)
      setTimeout(() => setSalvo(false), 2000)
    } catch (e) { console.error(e); alert('Erro ao salvar anamnese.') }
    finally { setSalvando(false) }
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onVoltar} className="flex items-center gap-1.5 text-gray-500 hover:text-white text-xs font-bold uppercase tracking-wide transition-colors">
          <ArrowLeft size={14} /> Voltar
        </button>
        <div className="flex items-center gap-2">
          {salvo && <span className="text-[10px] text-green-400 font-bold bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg">Salvo</span>}
          {editando ? (
            <><Button variant="ghost" size="xs" onClick={() => setEditando(false)}>Cancelar</Button>
              <Button variant="primary" size="xs" loading={salvando} onClick={salvar}>Salvar</Button></>
          ) : (
            <Button variant="secondary" size="xs" onClick={() => setEditando(true)}>Editar</Button>
          )}
        </div>
      </div>
      <div className="mb-4">
        <h2 className="text-white text-sm font-bold">{inicial.titulo || inicial.name}</h2>
        <p className="text-gray-500 text-xs mt-0.5">{fmtData(inicial.date)}</p>
      </div>
      <div className="divide-y divide-[#323238]/40 bg-[#1a1a1a] rounded-lg border border-[#323238] overflow-hidden">
        {respostas.map((item, idx) => {
          const isSecao = item.tipo === 'Quebra de Seção' || item.tipo === 'Quebra de Sessão' || item.tipo === 'Section Break'
          if (isSecao) return (
            <div key={idx} className="px-6 py-5 bg-[#111113] flex items-center gap-4">
              <div className="flex-1 h-px bg-[#323238]" />
              <span className="text-[#2563eb] text-xs font-bold uppercase tracking-[0.25em] shrink-0">{item.pergunta}</span>
              <div className="flex-1 h-px bg-[#323238]" />
            </div>
          )
          if (item.tipo === 'Bloco HTML') return (
            <div key={idx} className="px-4 py-3 bg-[#0a0a0a]">
              <div className="text-xs text-gray-400 prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: item.conteudo_html || item.pergunta }} />
            </div>
          )
          if (item.tipo === 'Anexar Imagem') return (
            <div key={idx} className="hover:bg-white/5 transition-colors">
              <div className="px-4 pt-3 pb-1"><p className="text-white text-xs font-bold">{item.pergunta}</p></div>
              <div className="w-full pb-4">
                {item.resposta
                  ? <ImagemInterativa src={imgSrcs[`${inicial.name}_${idx}`] || `${FRAPPE_URL}${item.resposta}`} feedbackId={inicial.name} idx={idx} onRotate={() => handleRotate(item.resposta, idx)} />
                  : <span className="text-gray-600 text-xs italic px-4">Não enviada</span>}
              </div>
            </div>
          )
          return (
            <div key={idx} className="px-4 py-3">
              <p className="text-white text-xs font-bold leading-relaxed mb-1.5">{item.pergunta}</p>
              {editando
                ? <textarea
                    value={item.resposta || ''}
                    onChange={e => setResposta(idx, e.target.value)}
                    onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                    style={{ minHeight: '2.5rem', overflow: 'hidden' }}
                    className="w-full bg-[#29292e] border border-[#323238] focus:border-[#2563eb]/60 text-white text-xs rounded-lg px-3 py-2 outline-none resize-none leading-relaxed transition-colors"
                  />
                : <p className="text-gray-400 text-xs italic leading-relaxed">{item.resposta || <span className="text-gray-600 not-italic opacity-50">Não respondida</span>}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ModalNovaAnamnese({ alunoId, onClose, onCriada }) {
  const [formularios, setFormularios] = useState([])
  const [loading, setLoading] = useState(true)
  const [vinculando, setVinculando] = useState(null)

  useEffect(() => {
    listarFormularios()
      .then(r => setFormularios(r.list))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSelecionar = async (formulario) => {
    setVinculando(formulario.name)
    try {
      await vincularAnamnese(alunoId, formulario.name, true)
      onCriada()
      onClose()
    } catch (e) {
      console.error(e)
      alert('Erro ao vincular anamnese.')
    } finally {
      setVinculando(null)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Nova Anamnese" subtitle="Selecione um template" size="sm">
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : formularios.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum template"
            description="Crie templates em Formulários antes de vincular"
          />
        ) : (
          <div className="bg-[#1a1a1a] rounded-lg border border-[#323238] divide-y divide-[#323238]/50">
            {formularios.map(f => (
              <button
                key={f.name}
                onClick={() => handleSelecionar(f)}
                disabled={!!vinculando}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left disabled:opacity-50"
              >
                <span className="text-white text-sm font-medium truncate">{f.titulo || f.name}</span>
                {vinculando === f.name
                  ? <Spinner size="sm" />
                  : <ChevronRight size={14} className="text-gray-500 shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

function TabAnamnese({ anamneses: inicial, loading, alunoId, onRecarregar }) {
  const [lista, setLista] = useState(inicial)
  const [detalhe, setDetalhe] = useState(null)
  const [loadingDetalhe, setLoadingDetalhe] = useState(false)
  const [excluindo, setExcluindo] = useState(null)
  const [showNovaAnamnese, setShowNovaAnamnese] = useState(false)

  useEffect(() => { setLista(inicial) }, [inicial])

  const abrirAnamnese = async (item) => {
    setLoadingDetalhe(true)
    try { setDetalhe(await buscarAnamnese(item.name)) }
    catch (e) { console.error(e) }
    finally { setLoadingDetalhe(false) }
  }

  const handleExcluir = async (e, a) => {
    e.stopPropagation()
    const msg = a.status === 'Respondido'
      ? `Esta anamnese já foi respondida pelo aluno. Tem certeza que deseja excluir "${a.titulo || a.name}"?`
      : `Excluir "${a.titulo || a.name}"?`
    if (!window.confirm(msg)) return
    setExcluindo(a.name)
    try {
      await excluirAnamnese(a.name)
      setLista(prev => prev.filter(x => x.name !== a.name))
    } catch (err) {
      console.error(err)
      alert('Erro ao excluir anamnese.')
    } finally { setExcluindo(null) }
  }

  if (loading || loadingDetalhe) return <div className="flex justify-center py-12"><Spinner /></div>
  if (detalhe) return <AnamneseViewer anamnese={detalhe} onVoltar={() => setDetalhe(null)} />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-xs">{lista.length} anamnese{lista.length !== 1 ? 's' : ''}</span>
        <Button variant="primary" size="xs" icon={Plus} onClick={() => setShowNovaAnamnese(true)}>
          Nova Anamnese
        </Button>
      </div>

      {lista.length === 0 ? (
        <EmptyState icon={BarChart2} title="Sem anamneses" description="Nenhuma anamnese vinculada a este aluno" />
      ) : (
        <div className="bg-[#29292e] rounded-lg border border-[#323238] divide-y divide-[#323238]/50">
          {lista.map((a) => (
            <div key={a.name} onClick={() => abrirAnamnese(a)} className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors">
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-medium truncate">{a.titulo || a.name}</p>
                <p className="text-gray-500 text-xs">{fmtData(a.date)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                {a.status === 'Respondido' && <Badge variant="success" size="sm">Respondido</Badge>}
                {a.status === 'Enviado' && <Badge variant="warning" size="sm">Enviado</Badge>}
                {!a.status && <Badge variant="default" size="sm">Pendente</Badge>}
                <button
                  onClick={(e) => handleExcluir(e, a)}
                  disabled={excluindo === a.name}
                  title="Excluir anamnese"
                  className="h-7 w-7 flex items-center justify-center text-[#2563eb] hover:text-white border border-[#2563eb]/30 hover:bg-[#2563eb] rounded-lg transition-colors disabled:opacity-40"
                >
                  <Trash2 size={12} />
                </button>
                <ChevronRight size={16} className="text-gray-600" onClick={() => abrirAnamnese(a)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {showNovaAnamnese && (
        <ModalNovaAnamnese
          alunoId={alunoId}
          onClose={() => setShowNovaAnamnese(false)}
          onCriada={() => { onRecarregar?.() }}
        />
      )}
    </div>
  )
}

function TabLista({ itens, renderItem, onClick }) {
  return (
    <div className="bg-[#29292e] rounded-lg border border-[#323238] divide-y divide-[#323238]/50">
      {itens.map((item, i) => (
        <div key={item.name || i} onClick={() => onClick?.(item)} className={`flex items-center justify-between px-4 py-3 ${onClick ? 'cursor-pointer hover:bg-white/5 transition-colors' : ''}`}>
          {renderItem(item)}
        </div>
      ))}
    </div>
  )
}

// ─── AlunoModal (componente principal exportado) ──────────────────────────────

export default function AlunoModal({ aluno: alunoBase, onClose }) {
  const navigate = useNavigate()
  const [abaAtiva, setAbaAtiva] = useState('perfil')

  const [perfilData, setPerfilData] = useState(null)
  const [loadingPerfil, setLoadingPerfil] = useState(false)
  const [dietas, setDietas] = useState([])
  const [loadingDietas, setLoadingDietas] = useState(false)
  const [dietasCarregadas, setDietasCarregadas] = useState(false)
  const [fichas, setFichas] = useState([])
  const [loadingFichas, setLoadingFichas] = useState(false)
  const [fichasCarregadas, setFichasCarregadas] = useState(false)
  const [anamneses, setAnamneses] = useState([])
  const [loadingAnamneses, setLoadingAnamneses] = useState(false)
  const [avaliacoes, setAvaliacoes] = useState([])
  const [loadingAvaliacoes, setLoadingAvaliacoes] = useState(false)
  const [avaliacoesCarregadas, setAvaliacoesCarregadas] = useState(false)

  useEffect(() => {
    if (!alunoBase) return
    const id = alunoBase.name
    setLoadingPerfil(true)
    buscarAluno(id).then(setPerfilData).catch(console.error).finally(() => setLoadingPerfil(false))
    setLoadingAnamneses(true)
    listarAnamneses({ alunoId: id, limit: 50 }).then(r => setAnamneses(r.list)).catch(console.error).finally(() => setLoadingAnamneses(false))
  }, [alunoBase])

  useEffect(() => {
    if (!alunoBase) return
    const id = alunoBase.name
    if (abaAtiva === 'dietas' && !dietasCarregadas) {
      setLoadingDietas(true)
      listarDietas({ alunoId: id, limit: 50 }).then(r => { setDietas(r.list); setDietasCarregadas(true) }).catch(console.error).finally(() => setLoadingDietas(false))
    }
    if (abaAtiva === 'treinos' && !fichasCarregadas) {
      setLoadingFichas(true)
      listarFichas({ aluno: id, limit: 50 }).then(r => { setFichas(r.list); setFichasCarregadas(true) }).catch(console.error).finally(() => setLoadingFichas(false))
    }
    if (abaAtiva === 'composicao' && !avaliacoesCarregadas) {
      setLoadingAvaliacoes(true)
      listarAvaliacoesPorAluno(id)
        .then(list => {
          // mais recente primeiro para exibição
          setAvaliacoes([...list].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))))
          setAvaliacoesCarregadas(true)
        })
        .catch(console.error)
        .finally(() => setLoadingAvaliacoes(false))
    }
  }, [abaAtiva, alunoBase])

  if (!alunoBase) return null

  return (
    <Modal isOpen onClose={onClose} title={alunoBase.nome_completo} subtitle={alunoBase.email} size="lg">
      <div className="flex flex-col">
        <Tabs
          tabs={[
            { id: 'perfil', label: 'Perfil' },
            { id: 'dietas', label: 'Dietas' },
            { id: 'treinos', label: 'Treinos' },
            { id: 'anamnese', label: 'Anamnese' },
            { id: 'composicao', label: 'Composição Corporal' },
          ]}
          active={abaAtiva}
          onChange={setAbaAtiva}
          variant="underline"
        />
        <div className="p-4 min-h-[360px]">
          {abaAtiva === 'perfil' && (
            loadingPerfil ? <div className="flex justify-center py-12"><Spinner /></div>
              : perfilData ? <TabPerfil aluno={perfilData} alunoId={alunoBase.name} /> : null
          )}
          {abaAtiva === 'dietas' && (
            loadingDietas ? <div className="flex justify-center py-12"><Spinner /></div>
              : dietas.length === 0 && dietasCarregadas
                ? <EmptyState icon={BarChart2} title="Sem dietas" description="Nenhuma dieta vinculada a este aluno" />
                : <TabLista itens={dietas}
                    renderItem={(d) => (
                      <>
                        <div>
                          <p className="text-white text-sm font-medium">{d.strategy || '—'}</p>
                          <p className="text-gray-500 text-xs">{fmtData(d.date)} → {fmtData(d.final_date)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {d.total_calories > 0 && <span className="text-xs text-orange-400 font-bold">{d.total_calories} kcal</span>}
                          <ChevronRight size={16} className="text-gray-600" />
                        </div>
                      </>
                    )}
                    onClick={(d) => { onClose(); navigate(`/dietas/${d.name}`) }}
                  />
          )}
          {abaAtiva === 'treinos' && (
            loadingFichas ? <div className="flex justify-center py-12"><Spinner /></div>
              : fichas.length === 0 && fichasCarregadas
                ? <EmptyState icon={BarChart2} title="Sem treinos" description="Nenhuma ficha vinculada a este aluno" />
                : <TabLista itens={fichas}
                    renderItem={(f) => (
                      <>
                        <div>
                          <p className="text-white text-sm font-medium">{f.objetivo || '—'}</p>
                          <p className="text-gray-500 text-xs">{f.nivel || ''} · {fmtData(f.data_de_inicio)} → {fmtData(f.data_de_fim)}</p>
                        </div>
                        <ChevronRight size={16} className="text-gray-600" />
                      </>
                    )}
                    onClick={(f) => { onClose(); navigate(`/fichas/${f.name}`) }}
                  />
          )}
          {abaAtiva === 'anamnese' && (
            <TabAnamnese
              anamneses={anamneses}
              loading={loadingAnamneses}
              alunoId={alunoBase.name}
              onRecarregar={() => {
                setLoadingAnamneses(true)
                listarAnamneses({ alunoId: alunoBase.name, limit: 50 })
                  .then(r => setAnamneses(r.list))
                  .catch(console.error)
                  .finally(() => setLoadingAnamneses(false))
              }}
            />
          )}
          {abaAtiva === 'composicao' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                  {avaliacoes.length} avaliaç{avaliacoes.length === 1 ? 'ão' : 'ões'}
                </p>
                <div className="flex items-center gap-2">
                  {avaliacoes.length > 0 && (
                    <Button
                      variant="secondary"
                      size="xs"
                      icon={BarChart2}
                      onClick={() => {
                        onClose()
                        navigate('/avaliacoes', { state: { aluno: { aluno: alunoBase.name, nome_completo: alunoBase.nome_completo } } })
                      }}
                    >
                      Comparar
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="xs"
                    icon={Plus}
                    onClick={() => {
                      onClose()
                      navigate('/avaliacoes/nova', { state: { aluno: { aluno: alunoBase.name, nome_completo: alunoBase.nome_completo } } })
                    }}
                  >
                    Nova Avaliação
                  </Button>
                </div>
              </div>

              {loadingAvaliacoes ? (
                <div className="flex justify-center py-12"><Spinner /></div>
              ) : avaliacoes.length === 0 && avaliacoesCarregadas ? (
                <EmptyState
                  icon={BarChart2}
                  title="Sem avaliações"
                  description="Nenhuma avaliação de composição corporal cadastrada para este aluno"
                />
              ) : (
                <div className="border border-[#323238] rounded-lg overflow-hidden divide-y divide-[#323238]/50">
                  {avaliacoes.map(av => (
                    <button
                      key={av.name}
                      onClick={() => {
                        onClose()
                        navigate('/avaliacoes', { state: { aluno: { aluno: av.aluno, nome_completo: av.nome_completo } } })
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold">{fmtData(av.date)}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {av.weight > 0 && (
                            <span className="text-gray-500 text-[10px] font-mono">{Number(av.weight).toFixed(1)} kg</span>
                          )}
                          {av.bmi > 0 && (
                            <span className="text-gray-500 text-[10px] font-mono">IMC {Number(av.bmi).toFixed(1)}</span>
                          )}
                          {av.lean_mass > 0 && (
                            <span className="text-emerald-400/80 text-[10px] font-mono">MM {Number(av.lean_mass).toFixed(1)}</span>
                          )}
                          {av.fat_mass > 0 && (
                            <span className="text-orange-400/80 text-[10px] font-mono">MG {Number(av.fat_mass).toFixed(1)}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {av.jp7_body_fat > 0 ? (
                          <>
                            <p className="text-[#2563eb] text-sm font-bold">{Number(av.jp7_body_fat).toFixed(1)}%</p>
                            <p className="text-gray-600 text-[9px] uppercase tracking-wider">JP7</p>
                          </>
                        ) : (
                          <span className="text-gray-600 text-[10px]">—</span>
                        )}
                      </div>
                      <ChevronRight size={14} className="text-gray-600 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
