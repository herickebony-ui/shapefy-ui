import { useState, useEffect } from 'react'
import { Plus, X, FileText, Send } from 'lucide-react'
import { Modal, Button, FormGroup, Autocomplete, Spinner, EmptyState } from '../ui'
import { listarAlunos } from '../../api/alunos'
import { listarFormularios, vincularAnamnese, listarAnamneses } from '../../api/anamneses'

const buscarAlunosFn = async (q) => {
  if (q.length < 1) return []
  try {
    const res = await listarAlunos({ search: q, limit: 8 })
    return res.list
  } catch { return [] }
}

export default function VincularAnamneseModal({
  alunoPreSelecionado = null,
  onClose,
  onVinculada,
}) {
  const [aluno, setAluno] = useState(alunoPreSelecionado)
  const [formularios, setFormularios] = useState([])
  const [formularioSelecionado, setFormularioSelecionado] = useState('')
  const [enviarAluno, setEnviarAluno] = useState(true)
  const [loadingForms, setLoadingForms] = useState(true)
  const [vinculando, setVinculando] = useState(false)
  const [anamnesesAluno, setAnamnesesAluno] = useState([])

  useEffect(() => {
    listarFormularios()
      .then(r => setFormularios(r.list || []))
      .catch(console.error)
      .finally(() => setLoadingForms(false))
  }, [])

  useEffect(() => {
    if (!aluno) { setAnamnesesAluno([]); return }
    listarAnamneses({ alunoId: aluno.name, limit: 50 })
      .then(r => setAnamnesesAluno(r.list || []))
      .catch(() => setAnamnesesAluno([]))
  }, [aluno])

  const handleVincular = async () => {
    if (!aluno) return alert('Selecione um aluno.')
    if (!formularioSelecionado) return alert('Selecione um formulário.')
    if (vinculando) return

    const formNome = formularios.find(f => f.name === formularioSelecionado)?.titulo || formularioSelecionado
    const jaExiste = anamnesesAluno.some(a =>
      a.formulario === formularioSelecionado || a.titulo === formNome,
    )
    if (jaExiste && !window.confirm(
      `Este aluno já tem uma anamnese "${formNome}". Deseja criar mais uma assim mesmo?`,
    )) return

    setVinculando(true)
    try {
      await vincularAnamnese(aluno.name, formularioSelecionado, enviarAluno)
      onVinculada?.()
      onClose()
    } catch (e) {
      console.error(e)
      alert('Erro ao vincular anamnese.')
    } finally { setVinculando(false) }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Vincular Anamnese"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            icon={Plus}
            onClick={handleVincular}
            loading={vinculando}
            disabled={!aluno || !formularioSelecionado}
          >
            Vincular
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
              title="Nenhum template"
              description="Crie templates em 'Criar Formulários' antes de vincular"
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

        <button
          type="button"
          onClick={() => setEnviarAluno(v => !v)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
            enviarAluno
              ? 'bg-green-500/10 border-green-500/40 text-green-300'
              : 'bg-[#1a1a1a] border-[#323238] text-gray-400 hover:border-gray-500'
          }`}
        >
          <span className={`h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center ${
            enviarAluno ? 'bg-green-500 border-green-500' : 'border-[#323238]'
          }`}>
            {enviarAluno && <span className="text-white text-[10px] font-bold">✓</span>}
          </span>
          <span className="text-sm font-medium flex items-center gap-2">
            <Send size={12} /> Enviar para o aluno preencher
          </span>
        </button>
      </div>
    </Modal>
  )
}
