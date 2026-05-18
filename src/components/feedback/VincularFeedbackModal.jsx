import { useState, useEffect } from 'react'
import { Link2, X, FileText, Send } from 'lucide-react'
import { Modal, Button, FormGroup, Autocomplete, Spinner, EmptyState } from '../ui'
import { listarAlunos } from '../../api/alunos'
import { listarFormularios, vincularFeedback } from '../../api/feedbacks'
import useErrorModal from '../../hooks/useErrorModal'

const buscarAlunosFn = async (q) => {
  if (q.length < 1) return []
  try {
    const res = await listarAlunos({ search: q, limit: 8 })
    return res.list
  } catch { return [] }
}

export default function VincularFeedbackModal({
  alunoPreSelecionado = null,
  onClose,
  onVinculado,
}) {
  const [aluno, setAluno] = useState(alunoPreSelecionado)
  const [formularios, setFormularios] = useState([])
  const [formularioSelecionado, setFormularioSelecionado] = useState('')
  const [loadingForms, setLoadingForms] = useState(true)
  const [vinculando, setVinculando] = useState(false)
  const errorModal = useErrorModal()

  useEffect(() => {
    listarFormularios()
      .then(list => setFormularios(list || []))
      .catch(console.error)
      .finally(() => setLoadingForms(false))
  }, [])

  const handleVincular = async () => {
    if (!aluno || !formularioSelecionado) {
      const faltando = []
      if (!aluno) faltando.push('Campo obrigatório: Aluno')
      if (!formularioSelecionado) faltando.push('Campo obrigatório: Formulário')
      errorModal.show({
        type: 'mandatory',
        title: 'Campos obrigatórios não preenchidos',
        messages: faltando,
        statusCode: 0,
      }, 'Vincular feedback')
      return
    }
    if (vinculando) return
    setVinculando(true)
    try {
      await vincularFeedback(aluno.name, formularioSelecionado)
      onVinculado?.()
      onClose()
    } catch (e) {
      errorModal.show(e, 'Vincular feedback')
    } finally {
      setVinculando(false)
    }
  }

  return (<>
    {errorModal.element}
    <Modal
      isOpen
      onClose={onClose}
      title="Vincular Feedback"
      subtitle="Dispara o feedback pra o aluno preencher e gera notificação no app"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            icon={Send}
            onClick={handleVincular}
            loading={vinculando}
            disabled={!aluno || !formularioSelecionado}
          >
            Vincular e enviar
          </Button>
        </>
      }
    >
      <div className="p-4 space-y-4">
        <FormGroup label="Aluno" required>
          {aluno ? (
            <div className="flex items-center justify-between h-10 px-3 rounded-lg bg-[#29292e] border border-[#2563eb]/40">
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{aluno.nome_completo}</p>
                {aluno.email && <p className="text-gray-500 text-[11px] truncate">{aluno.email}</p>}
              </div>
              {!alunoPreSelecionado && (
                <button
                  onClick={() => { setAluno(null); setFormularioSelecionado('') }}
                  className="text-gray-500 hover:text-red-400 transition-colors ml-2 shrink-0"
                  title="Trocar aluno"
                >
                  <X size={14} />
                </button>
              )}
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

        <FormGroup label="Formulário" required>
          {loadingForms ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : formularios.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhum template ativo"
              description="Crie um template de feedback em 'Criar Formulários' antes de vincular"
            />
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {formularios.map(f => {
                const ativo = formularioSelecionado === f.name
                return (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => setFormularioSelecionado(f.name)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
                      ativo
                        ? 'bg-[#2563eb]/10 border-[#2563eb] text-white'
                        : 'bg-[#1a1a1a] border-[#323238] text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <span className={`h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      ativo ? 'border-[#2563eb]' : 'border-[#323238]'
                    }`}>
                      {ativo && <span className="h-2 w-2 rounded-full bg-[#2563eb]" />}
                    </span>
                    <span className="text-sm font-medium truncate">{f.titulo || f.name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </FormGroup>

        <div className="rounded-lg border border-[#0052cc]/40 bg-[#0052cc]/10 px-4 py-3 text-xs text-blue-200 flex items-start gap-2">
          <Link2 size={14} className="mt-0.5 shrink-0" />
          <span>Ao vincular, o feedback é criado com status <strong>Enviado</strong> e o aluno recebe uma notificação no app pra preencher.</span>
        </div>
      </div>
    </Modal>
  </>)
}
