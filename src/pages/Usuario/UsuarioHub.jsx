import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, FileText, Trash2, ChevronRight } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import { Button, FormGroup, Input, Modal, Spinner } from '../../components/ui'
import client from '../../api/client'

export default function UsuarioHub() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const [modalSenha, setModalSenha] = useState(false)
  const [modalDados, setModalDados] = useState(false)
  const [modalExclusao, setModalExclusao] = useState(false)

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [erroSenha, setErroSenha] = useState('')

  const handleAlterarSenha = async () => {
    setErroSenha('')
    if (novaSenha !== confirmarSenha) { setErroSenha('As senhas não coincidem.'); return }
    if (novaSenha.length < 6) { setErroSenha('A senha deve ter ao menos 6 caracteres.'); return }
    setSalvandoSenha(true)
    try {
      await client.post('/api/method/shapefy.api.api.set_initial_password', {
        new_password: novaSenha,
      })
      setModalSenha(false)
      setSenhaAtual(''); setNovaSenha(''); setConfirmarSenha('')
    } catch (e) {
      console.error(e)
      setErroSenha('Erro ao alterar senha. Tente novamente.')
    } finally {
      setSalvandoSenha(false)
    }
  }

  const itens = [
    {
      icon: User,
      label: 'Editar Usuário',
      desc: 'Atualize seus dados profissionais',
      onClick: () => navigate('/perfil'),
      danger: false,
    },
    {
      icon: Lock,
      label: 'Alterar Senha',
      desc: 'Redefina sua senha de acesso',
      onClick: () => setModalSenha(true),
      danger: false,
    },
    {
      icon: FileText,
      label: 'Solicitar Dados',
      desc: 'Solicite uma cópia dos seus dados',
      onClick: () => setModalDados(true),
      danger: false,
    },
    {
      icon: Trash2,
      label: 'Solicitar Exclusão de Conta',
      desc: 'Encerre permanentemente sua conta',
      onClick: () => setModalExclusao(true),
      danger: true,
    },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Banner */}
      <div className="relative h-28 bg-gradient-to-b from-[#222226] to-[#0a0a0a] flex items-end px-4 pb-4">
        <div>
          <p className="text-gray-400 text-xs">Conta</p>
          <h1 className="text-lg font-bold text-white truncate">{user}</h1>
        </div>
      </div>

      <div className="px-4 md:px-6 pb-6 space-y-2 mt-2">
        {itens.map(({ icon: Icon, label, desc, onClick, danger }) => (
          <button
            key={label}
            onClick={onClick}
            className={`w-full flex items-center gap-4 px-4 py-4 bg-[#29292e] border rounded-lg transition-colors text-left
              ${danger
                ? 'border-[#850000]/30 hover:border-[#850000] hover:bg-[#850000]/10'
                : 'border-[#323238] hover:border-[#4a4a52]'
              }`}
          >
            <div className={`flex items-center justify-center h-9 w-9 rounded-lg shrink-0
              ${danger ? 'bg-[#850000]/20' : 'bg-[#222226]'}`}>
              <Icon size={16} className={danger ? 'text-[#850000]' : 'text-gray-400'} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${danger ? 'text-[#850000]' : 'text-white'}`}>{label}</p>
              <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
            </div>
            <ChevronRight size={15} className={danger ? 'text-[#850000]' : 'text-gray-600'} />
          </button>
        ))}
      </div>

      {/* Modal alterar senha */}
      {modalSenha && (
        <Modal
          title="Alterar Senha"
          onClose={() => { setModalSenha(false); setErroSenha('') }}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalSenha(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleAlterarSenha} loading={salvandoSenha}>Salvar</Button>
            </>
          }
        >
          <div className="p-4 space-y-4">
            <FormGroup label="Nova Senha" required error={erroSenha}>
              <Input type="password" value={novaSenha} onChange={setNovaSenha} placeholder="Mínimo 6 caracteres" />
            </FormGroup>
            <FormGroup label="Confirmar Senha" required>
              <Input type="password" value={confirmarSenha} onChange={setConfirmarSenha} placeholder="Repita a nova senha" />
            </FormGroup>
          </div>
        </Modal>
      )}

      {/* Modal solicitar dados */}
      {modalDados && (
        <Modal
          title="Solicitar Dados"
          onClose={() => setModalDados(false)}
          size="sm"
          footer={
            <Button variant="ghost" onClick={() => setModalDados(false)}>Fechar</Button>
          }
        >
          <div className="p-4">
            <p className="text-gray-400 text-sm">
              Para solicitar uma cópia dos seus dados, entre em contato com o suporte pelo e-mail{' '}
              <a href="mailto:suporte@shapefyapp.com" className="text-brand underline">suporte@shapefyapp.com</a>.
            </p>
          </div>
        </Modal>
      )}

      {/* Modal exclusão de conta */}
      {modalExclusao && (
        <Modal
          title="Solicitar Exclusão de Conta"
          onClose={() => setModalExclusao(false)}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalExclusao(false)}>Cancelar</Button>
              <Button
                variant="danger"
                onClick={() => {
                  window.location.href = 'mailto:suporte@shapefyapp.com?subject=Solicitação de exclusão de conta'
                  setModalExclusao(false)
                }}
              >
                Enviar solicitação
              </Button>
            </>
          }
        >
          <div className="p-4">
            <p className="text-gray-400 text-sm">
              A exclusão de conta é permanente e remove todos os seus dados da plataforma.
              Para continuar, envie um e-mail ao nosso suporte.
            </p>
          </div>
        </Modal>
      )}
    </div>
  )
}
