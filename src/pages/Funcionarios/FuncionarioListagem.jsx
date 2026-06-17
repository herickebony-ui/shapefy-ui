import { useState, useEffect } from 'react'
import { UserPlus, Edit2, UserX, Users, UserCheck, KeyRound } from 'lucide-react'
import {
  listarFuncionarios, criarFuncionario, atualizarPermissoes, desativarFuncionario, reativarFuncionario, enviarResetSenha,
} from '../../api/funcionarios'
import { Button, FormGroup, Input, Modal } from '../../components/ui'
import ListPage from '../../components/templates/ListPage'
import useErrorModal from '../../hooks/useErrorModal'

// Módulos e ações disponíveis
const MODULOS = [
  { key: 'aluno',        label: 'Alunos' },
  { key: 'treino',       label: 'Fichas / Treinos' },
  { key: 'dieta',        label: 'Dietas' },
  { key: 'alimentos',    label: 'Alimentos' },
  { key: 'feedback',     label: 'Feedbacks' },
  { key: 'anamnese',     label: 'Anamneses' },
  { key: 'avaliacao',    label: 'Avaliações' },
  { key: 'prescricao',   label: 'Prescrições' },
  { key: 'pagamentos',   label: 'Pagamentos' },
  { key: 'planos',       label: 'Planos' },
  { key: 'banco_textos', label: 'Banco de Textos' },
  { key: 'notificacoes', label: 'Notificações' },
]

const ACOES = [
  { key: 'ler',     label: 'Ler' },
  { key: 'criar',   label: 'Criar' },
  { key: 'editar',  label: 'Editar' },
  { key: 'deletar', label: 'Deletar' },
]

function permissoesVazias() {
  return Object.fromEntries(MODULOS.map(m => [m.key, { ler: 0, criar: 0, editar: 0, deletar: 0 }]))
}

function parsePermissoes(raw) {
  if (!raw) return permissoesVazias()
  try {
    const p = typeof raw === 'string' ? JSON.parse(raw) : raw
    const result = permissoesVazias()
    for (const mod of MODULOS) {
      if (p[mod.key]) result[mod.key] = { ...result[mod.key], ...p[mod.key] }
    }
    return result
  } catch {
    return permissoesVazias()
  }
}

function permissoesAtivas(perms) {
  return MODULOS.filter(m => Object.values(perms[m.key] || {}).some(Boolean)).map(m => m.label)
}

// Checkbox da matriz
function MatrizCheck({ checked, onChange }) {
  return (
    <input
      type="checkbox"
      checked={!!checked}
      onChange={e => onChange(e.target.checked)}
      className="w-4 h-4 accent-[#2563eb] cursor-pointer"
    />
  )
}

// Linha de módulo — ao marcar "Ler", desmarca tudo se já estava ativo; ao marcar outro, auto-ativa "Ler"
function ModuloRow({ modulo, perms, onChange }) {
  function toggle(acao, val) {
    const next = { ...perms }
    next[acao] = val ? 1 : 0
    // Se ativou qualquer coisa, garante "ler" ligado
    if (val && acao !== 'ler') next.ler = 1
    // Se desativou "ler", zera tudo
    if (!val && acao === 'ler') {
      for (const a of ACOES) next[a.key] = 0
    }
    onChange(next)
  }

  return (
    <tr className="border-b border-[#2a2a2f] hover:bg-white/[0.02]">
      <td className="py-2.5 pr-4 text-sm text-gray-300 font-medium whitespace-nowrap">{modulo.label}</td>
      {ACOES.map(a => (
        <td key={a.key} className="text-center py-2.5 px-2">
          <MatrizCheck
            checked={perms[a.key]}
            onChange={val => toggle(a.key, val)}
          />
        </td>
      ))}
      <td className="py-2.5 pl-3">
        <button
          onClick={() => onChange(Object.fromEntries(ACOES.map(a => [a.key, 1])))}
          className="text-[11px] text-blue-500 hover:text-blue-400 mr-2"
          title="Marcar tudo"
        >tudo</button>
        <button
          onClick={() => onChange(Object.fromEntries(ACOES.map(a => [a.key, 0])))}
          className="text-[11px] text-gray-600 hover:text-gray-400"
          title="Limpar"
        >limpar</button>
      </td>
    </tr>
  )
}

// Modal de criar / editar
function ModalFuncionario({ funcionario, onSave, onClose }) {
  const isEdit = !!funcionario
  const errorModal = useErrorModal()
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState(funcionario?.user || '')
  const [nome, setNome] = useState(funcionario?.nome || '')
  const [perms, setPerms] = useState(parsePermissoes(funcionario?.permissoes))

  function setModuloPerm(modKey, val) {
    setPerms(prev => ({ ...prev, [modKey]: val }))
  }

  function marcarTudo() {
    setPerms(Object.fromEntries(MODULOS.map(m => [m.key, Object.fromEntries(ACOES.map(a => [a.key, 1]))])))
  }

  function limparTudo() {
    setPerms(permissoesVazias())
  }

  async function handleSave() {
    if (!nome.trim()) return errorModal.show({ type: 'mandatory', title: 'Campo obrigatório', messages: ['Nome é obrigatório.'], statusCode: 0 }, 'Funcionário')
    if (!isEdit && !email.trim()) return errorModal.show({ type: 'mandatory', title: 'Campo obrigatório', messages: ['E-mail é obrigatório.'], statusCode: 0 }, 'Funcionário')
    setSaving(true)
    try {
      if (isEdit) {
        await atualizarPermissoes(funcionario.name, perms)
      } else {
        await criarFuncionario({ email, nome, permissoes: perms })
      }
      onSave()
    } catch (err) {
      errorModal.show(err, isEdit ? 'Atualizar permissões' : 'Criar funcionário')
    } finally {
      setSaving(false)
    }
  }

  return (<>
    {errorModal.element}
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Editar Permissões' : 'Novo Funcionário'}
      size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="primary" onClick={handleSave} loading={saving}>
          {isEdit ? 'Salvar' : 'Criar Funcionário'}
        </Button>
      </>}
    >
      <div className="p-5 space-y-5">
        {/* Dados básicos */}
        {!isEdit ? (
          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="E-mail" required>
              <Input value={email} onChange={setEmail} placeholder="email@exemplo.com" type="email" />
            </FormGroup>
            <FormGroup label="Nome" required>
              <Input value={nome} onChange={setNome} placeholder="Nome do funcionário" />
            </FormGroup>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#2563eb]/20 flex items-center justify-center text-blue-400 font-bold text-sm flex-shrink-0">
              {funcionario.nome?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white text-sm font-medium">{funcionario.nome}</p>
              <p className="text-gray-500 text-xs">{funcionario.user}</p>
            </div>
          </div>
        )}

        {/* Matriz de permissões */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Permissões de acesso</p>
            <div className="flex gap-3">
              <button onClick={marcarTudo} className="text-xs text-blue-400 hover:text-blue-300">Marcar tudo</button>
              <button onClick={limparTudo} className="text-xs text-gray-500 hover:text-gray-400">Limpar tudo</button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-[#2a2a2f]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a2f] bg-[#1a1a1f]">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Módulo</th>
                  {ACOES.map(a => (
                    <th key={a.key} className="text-center py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">{a.label}</th>
                  ))}
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {MODULOS.map(m => (
                  <ModuloRow
                    key={m.key}
                    modulo={m}
                    perms={perms[m.key] || { ler: 0, criar: 0, editar: 0, deletar: 0 }}
                    onChange={val => setModuloPerm(m.key, val)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  </>)
}

// Card de funcionário na listagem
function FuncionarioCard({ func, onEditar, onDesativar, onReativar, onResetSenha, inativo }) {
  const perms = parsePermissoes(func.permissoes)
  const ativas = permissoesAtivas(perms)

  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
      inativo
        ? 'bg-[#1a1a1f] border-[#2a2a2f] opacity-60'
        : 'bg-[#29292e] border-[#323238] hover:border-[#3a3a40]'
    }`}>
      <div className="w-10 h-10 rounded-full bg-[#2563eb]/20 flex items-center justify-center text-blue-400 font-bold text-sm flex-shrink-0">
        {func.nome?.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-white text-sm font-medium">{func.nome}</p>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${inativo ? 'bg-gray-700 text-gray-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
            {inativo ? 'Inativo' : 'Ativo'}
          </span>
        </div>
        <p className="text-gray-500 text-xs mb-2">{func.user}</p>

        {ativas.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {ativas.map(label => (
              <span key={label} className="px-2 py-0.5 rounded-full bg-[#1e2a3a] border border-[#2563eb]/20 text-blue-300 text-[11px]">
                {label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-xs italic">Sem acesso a módulos</p>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={onEditar} title="Editar permissões" className="p-2 text-gray-400 hover:text-white hover:bg-[#323238] rounded-lg transition-colors">
          <Edit2 size={15} />
        </button>
        {onResetSenha && (
          <button onClick={onResetSenha} title="Enviar redefinição de senha" className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
            <KeyRound size={15} />
          </button>
        )}
        {!inativo && onDesativar && (
          <button onClick={onDesativar} title="Desativar" className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
            <UserX size={15} />
          </button>
        )}
        {inativo && onReativar && (
          <button onClick={onReativar} title="Reativar" className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors">
            <UserCheck size={15} />
          </button>
        )}
      </div>
    </div>
  )
}

// Página principal
export default function FuncionarioListagem() {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null)
  const errorModal = useErrorModal()

  async function carregar() {
    setLoading(true)
    try {
      setLista(await listarFuncionarios())
    } catch (err) {
      errorModal.show(err, 'Carregar funcionários')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  async function handleDesativar(func) {
    if (!confirm(`Desativar ${func.nome}? O acesso será revogado imediatamente.`)) return
    try {
      await desativarFuncionario(func.name)
      carregar()
    } catch (err) {
      errorModal.show(err, 'Desativar funcionário')
    }
  }

  async function handleReativar(func) {
    if (!confirm(`Reativar ${func.nome}? O acesso será restaurado.`)) return
    try {
      await reativarFuncionario(func.name)
      carregar()
    } catch (err) {
      errorModal.show(err, 'Reativar funcionário')
    }
  }

  async function handleResetSenha(func) {
    if (!confirm(`Enviar email de redefinição de senha para ${func.nome} (${func.user})?`)) return
    try {
      await enviarResetSenha(func.name)
      alert('Email de redefinição de senha enviado!')
    } catch (err) {
      errorModal.show(err, 'Enviar redefinição de senha')
    }
  }

  function fecharModal() { setModalAberto(false); setEditando(null) }
  function onSalvo() { fecharModal(); carregar() }

  const ativos = lista.filter(f => f.status === 'Ativo')
  const inativos = lista.filter(f => f.status !== 'Ativo')

  return (
    <>
      {errorModal.element}
      {modalAberto && (
        <ModalFuncionario
          funcionario={editando}
          onSave={onSalvo}
          onClose={fecharModal}
        />
      )}

      <ListPage
        title="Funcionários"
        description="Gerencie assistentes com acesso limitado ao sistema"
        loading={loading}
        actions={
          <Button variant="primary" icon={UserPlus} onClick={() => { setEditando(null); setModalAberto(true) }}>
            Novo Funcionário
          </Button>
        }
        empty={lista.length === 0 && !loading ? {
          icon: Users,
          title: 'Nenhum funcionário cadastrado',
          description: 'Adicione assistentes para colaborar no atendimento dos seus alunos.',
        } : null}
      >
        {lista.length > 0 && (
          <div className="p-4 space-y-6">
            {ativos.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Ativos ({ativos.length})</p>
                <div className="space-y-2">
                  {ativos.map(func => (
                    <FuncionarioCard key={func.name} func={func} onEditar={() => { setEditando(func); setModalAberto(true) }} onDesativar={() => handleDesativar(func)} onResetSenha={() => handleResetSenha(func)} />
                  ))}
                </div>
              </section>
            )}
            {inativos.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Inativos ({inativos.length})</p>
                <div className="space-y-2">
                  {inativos.map(func => (
                    <FuncionarioCard key={func.name} func={func} onEditar={() => { setEditando(func); setModalAberto(true) }} onReativar={() => handleReativar(func)} inativo />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </ListPage>
    </>
  )
}
