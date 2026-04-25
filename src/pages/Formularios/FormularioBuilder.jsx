import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, ChevronUp, ChevronDown, Save, ArrowLeft } from 'lucide-react'
import {
  criarFormularioAnamnese, salvarFormularioAnamnese, buscarFormularioAnamnese,
  criarFormularioFeedback, salvarFormularioFeedback, buscarFormularioFeedback,
} from '../../api/formularios'
import { TIPOS_ANAMNESE, TIPOS_FEEDBACK, TIPOS_CONFIG, FREQUENCIA_OPTS } from '../../utils/formularioUtils'
import { Button, FormGroup, Input, Select, Textarea, Spinner, Tabs, RichTextEditor } from '../../components/ui'

const gerarId = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`

const perguntaVazia = () => ({
  _id: gerarId(),
  pergunta: '',
  tipo: 'texto_curto',
  reqd: false,
  opcoes: '',
  conteudo_html: '',
})

function ToggleRow({ label, descricao, value, onChange }) {
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
        {value ? 'Sim' : 'Não'}
      </button>
    </div>
  )
}

export default function FormularioBuilder() {
  const navigate = useNavigate()
  const { tipo, id } = useParams()
  const isNovo = id === 'novo'
  const isFeedback = tipo === 'feedback'

  const [titulo, setTitulo] = useState('')
  const [perguntas, setPerguntas] = useState([perguntaVazia()])
  const [enabled, setEnabled] = useState(true)
  const [automacao, setAutomacao] = useState(false)
  const [feedbackInicial, setFeedbackInicial] = useState(false)
  const [dieta, setDieta] = useState(false)
  const [treino, setTreino] = useState(false)
  const [frequencia, setFrequencia] = useState('')
  const [frequenciaEmDias, setFrequenciaEmDias] = useState(0)
  const [loading, setLoading] = useState(!isNovo)
  const [salvando, setSalvando] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState('perguntas')

  const TIPOS = isFeedback ? TIPOS_FEEDBACK : TIPOS_ANAMNESE

  useEffect(() => {
    if (isNovo) return
    const buscar = isFeedback ? buscarFormularioFeedback : buscarFormularioAnamnese
    buscar(id)
      .then(doc => {
        setTitulo(doc.titulo || '')
        setPerguntas(doc.perguntas?.length ? doc.perguntas : [perguntaVazia()])
        if (isFeedback) {
          setEnabled(!!doc.enabled)
          setAutomacao(!!doc.automacao)
          setFeedbackInicial(!!doc.feedback_inicial)
          setDieta(!!doc.dieta)
          setTreino(!!doc.treino)
          setFrequencia(doc.frequencia || '')
          setFrequenciaEmDias(doc.frequencia_em_dias || 0)
        }
      })
      .catch(e => { console.error(e); alert('Erro ao carregar formulário.') })
      .finally(() => setLoading(false))
  }, [id, isNovo, isFeedback])

  const addPergunta = () => setPerguntas(prev => [...prev, perguntaVazia()])

  const removePergunta = (idx) => setPerguntas(prev => prev.filter((_, i) => i !== idx))

  const updatePergunta = (idx, campo, valor) =>
    setPerguntas(prev => prev.map((p, i) => i === idx ? { ...p, [campo]: valor } : p))

  const moverCima = (idx) => {
    if (idx === 0) return
    setPerguntas(prev => {
      const arr = [...prev]
      ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
      return arr
    })
  }

  const moverBaixo = (idx) => {
    setPerguntas(prev => {
      if (idx >= prev.length - 1) return prev
      const arr = [...prev]
      ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
      return arr
    })
  }

  const salvar = async () => {
    if (!titulo.trim()) { alert('Informe o título do formulário.'); return }
    setSalvando(true)
    try {
      if (isFeedback) {
        const payload = { titulo, enabled, automacao, feedback_inicial: feedbackInicial, dieta, treino, frequencia, frequencia_em_dias: frequenciaEmDias, perguntas }
        if (isNovo) {
          const doc = await criarFormularioFeedback(payload)
          navigate(`/criar-formularios/feedback/${doc.name}`, { replace: true })
        } else {
          await salvarFormularioFeedback(id, payload)
        }
      } else {
        const payload = { titulo, perguntas }
        if (isNovo) {
          const doc = await criarFormularioAnamnese(payload)
          navigate(`/criar-formularios/anamnese/${doc.name}`, { replace: true })
        } else {
          await salvarFormularioAnamnese(id, payload)
        }
      }
    } catch (e) {
      console.error(e)
      alert('Erro ao salvar formulário.')
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>

  const tipoLabel = isFeedback ? 'Feedback' : 'Anamnese'

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/criar-formularios')}
          className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors shrink-0"
        >
          <ArrowLeft size={14} />
        </button>
        <div>
          <h1 className="text-white text-lg font-bold">
            {isNovo ? `Novo Formulário de ${tipoLabel}` : `Editar Formulário de ${tipoLabel}`}
          </h1>
          <p className="text-gray-500 text-xs">Templates para enviar aos alunos</p>
        </div>
      </div>

      {/* Título */}
      <div className="bg-[#29292e] rounded-lg border border-[#323238] p-4">
        <FormGroup label="Título do formulário" required>
          <Input
            value={titulo}
            onChange={setTitulo}
            placeholder={isFeedback ? 'Ex: Feedback Mensal' : 'Ex: Anamnese Inicial'}
          />
        </FormGroup>
      </div>

      {/* Tabs (feedback only) */}
      {isFeedback && (
        <Tabs
          tabs={[
            { id: 'perguntas', label: 'Perguntas' },
            { id: 'automacao', label: 'Automação' },
          ]}
          active={abaAtiva}
          onChange={setAbaAtiva}
          variant="underline"
        />
      )}

      {/* Aba Automação */}
      {isFeedback && abaAtiva === 'automacao' && (
        <div className="bg-[#29292e] rounded-lg border border-[#323238] p-4 space-y-1">
          <ToggleRow label="Ativo" descricao="Formulário disponível para envio" value={enabled} onChange={setEnabled} />
          <ToggleRow label="Automação" descricao="Enviar automaticamente conforme frequência definida" value={automacao} onChange={setAutomacao} />
          {automacao && (
            <div className="pt-2 space-y-3">
              <FormGroup label="Frequência">
                <Select
                  value={frequencia}
                  onChange={setFrequencia}
                  options={[{ value: '', label: 'Selecionar...' }, ...FREQUENCIA_OPTS]}
                />
              </FormGroup>
              {frequencia === 'Personalizado' && (
                <FormGroup label="Frequência em dias">
                  <Input
                    value={String(frequenciaEmDias)}
                    onChange={v => setFrequenciaEmDias(Number(v) || 0)}
                    type="number"
                  />
                </FormGroup>
              )}
            </div>
          )}
          <div className="pt-3 pb-1">
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Campos exibidos no feedback do aluno</p>
            <ToggleRow label="Feedback inicial" descricao="Campo de comentário inicial" value={feedbackInicial} onChange={setFeedbackInicial} />
            <ToggleRow label="Dieta" descricao="Avaliação da dieta" value={dieta} onChange={setDieta} />
            <ToggleRow label="Treino" descricao="Avaliação do treino" value={treino} onChange={setTreino} />
          </div>
        </div>
      )}

      {/* Lista de perguntas */}
      {(!isFeedback || abaAtiva === 'perguntas') && (
        <div className="space-y-3">
          {perguntas.map((p, idx) => {
            const config = TIPOS_CONFIG[p.tipo] || {}
            return (
              <div key={p._id} className="bg-[#29292e] rounded-lg border border-[#323238] p-4 space-y-3">
                {/* Cabeçalho da pergunta */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-xs font-bold min-w-[1.5rem]">#{idx + 1}</span>
                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={() => moverCima(idx)}
                      disabled={idx === 0}
                      className="h-6 w-6 flex items-center justify-center text-gray-500 hover:text-white border border-[#323238] rounded transition-colors disabled:opacity-30"
                    >
                      <ChevronUp size={11} />
                    </button>
                    <button
                      onClick={() => moverBaixo(idx)}
                      disabled={idx === perguntas.length - 1}
                      className="h-6 w-6 flex items-center justify-center text-gray-500 hover:text-white border border-[#323238] rounded transition-colors disabled:opacity-30"
                    >
                      <ChevronDown size={11} />
                    </button>
                    <button
                      onClick={() => removePergunta(idx)}
                      className="h-6 w-6 flex items-center justify-center text-[#2563eb] hover:text-white border border-[#2563eb]/30 hover:bg-[#2563eb] rounded transition-colors"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                {/* Campos principais */}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-3">
                  <FormGroup label={config.isLayout ? 'Título da seção' : 'Pergunta'}>
                    <Input
                      value={p.pergunta}
                      onChange={v => updatePergunta(idx, 'pergunta', v)}
                      placeholder={config.isLayout ? 'Ex: Informações de Saúde' : 'Ex: Qual seu principal objetivo?'}
                    />
                  </FormGroup>
                  <FormGroup label="Tipo">
                    <Select
                      value={p.tipo}
                      onChange={v => updatePergunta(idx, 'tipo', v)}
                      options={TIPOS}
                    />
                  </FormGroup>
                </div>

                {/* Obrigatória */}
                {!config.isLayout && (
                  <label className="flex items-center gap-2 cursor-pointer w-fit">
                    <input
                      type="checkbox"
                      checked={!!p.reqd}
                      onChange={e => updatePergunta(idx, 'reqd', e.target.checked)}
                      className="rounded border-[#323238] bg-[#1a1a1a] accent-[#2563eb]"
                    />
                    <span className="text-gray-400 text-xs">Obrigatória</span>
                  </label>
                )}

                {/* Opções (seleção / múltipla / avaliação) */}
                {config.hasOpcoes && (
                  <FormGroup
                    label={config.opcoesLabel || 'Opções'}
                    hint={p.tipo !== 'avaliacao' ? 'Uma opção por linha' : undefined}
                  >
                    <Textarea
                      value={p.opcoes}
                      onChange={v => updatePergunta(idx, 'opcoes', v)}
                      rows={p.tipo === 'avaliacao' ? 1 : 4}
                      placeholder={p.tipo === 'avaliacao' ? '5' : 'Opção 1\nOpção 2\nOpção 3'}
                    />
                  </FormGroup>
                )}

                {/* HTML */}
                {config.hasHtml && (
                  <FormGroup label="Conteúdo HTML">
                    <RichTextEditor
                      value={p.conteudo_html}
                      onChange={v => updatePergunta(idx, 'conteudo_html', v)}
                      placeholder="Digite o conteúdo do bloco..."
                    />
                  </FormGroup>
                )}
              </div>
            )
          })}

          {/* Adicionar pergunta */}
          <button
            onClick={addPergunta}
            className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[#323238] hover:border-[#2563eb]/50 text-gray-500 hover:text-[#2563eb] rounded-lg transition-colors text-sm font-medium"
          >
            <Plus size={14} />
            Adicionar pergunta
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <Button variant="ghost" onClick={() => navigate('/formularios')}>Cancelar</Button>
        <Button variant="primary" icon={Save} loading={salvando} onClick={salvar}>
          {isNovo ? 'Criar Formulário' : 'Salvar Alterações'}
        </Button>
      </div>
    </div>
  )
}
