import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { login } from '../api/auth'
import { autenticarAluno, homeAluno } from '../api/aluno'
import { buscarAssinatura, buscarPlano } from '../api/assinatura'
import { minhasPermissoes } from '../api/funcionarios'
import { Input, Button } from '../components/ui'
import { tw } from '../styles/tokens'
import client from '../api/client'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setAuth = useAuthStore((s) => s.setAuth)
  const setAuthAluno = useAuthStore((s) => s.setAuthAluno)
  const setModulos = useAuthStore((s) => s.setModulos)
  const setFuncPermissoes = useAuthStore((s) => s.setFuncPermissoes)
  const initialRole = searchParams.get('role') === 'aluno' ? 'aluno' : 'profissional'
  const [tipo, setTipo] = useState(initialRole)
  const [form, setForm] = useState({ usr: '', pwd: '' })
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  // Aceita ?redirect (padrão do backend) e ?next (legado interno).
  const next = searchParams.get('redirect') || searchParams.get('next')

  // Ao chegar na /login, verifica se já há um token válido no localStorage.
  // Evita mostrar o formulário para quem foi redirecionado por engano.
  useEffect(() => {
    async function checkExistingSession() {
      const alunoToken = localStorage.getItem('aluno_token')
      const frappeToken = localStorage.getItem('frappe_token')

      if (alunoToken) {
        try {
          await client.get('/api/method/shapefy.api.aluno.perfil', { skipAuthRedirect: true })
          const lastPath = localStorage.getItem('aluno_last_path')
          const destination = (next && next.startsWith('/aluno'))
            ? next
            : (lastPath && lastPath.startsWith('/aluno') ? lastPath : '/aluno')
          navigate(destination, { replace: true })
          return
        } catch {
          // Token inválido ou expirado — limpa e mostra o formulário
          localStorage.removeItem('aluno_token')
          localStorage.removeItem('aluno_last_path')
        }
      } else if (frappeToken) {
        try {
          const frappeUser = localStorage.getItem('frappe_user')
          await client.get('/api/resource/Profissional', {
            params: {
              fields: JSON.stringify(['name']),
              filters: JSON.stringify([['user', '=', frappeUser]]),
              limit: 1,
            },
            skipAuthRedirect: true,
          })
          navigate(next && next.startsWith('/') && !next.startsWith('/aluno') ? next : '/', { replace: true })
          return
        } catch {
          // Token inválido — limpa e mostra o formulário
          localStorage.removeItem('frappe_token')
          localStorage.removeItem('frappe_user')
        }
      }

      setCheckingSession(false)
    }
    checkExistingSession()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLoginProfissional(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await login(form.usr, form.pwd)
      const token = res.message.token
      const fullName = res.message.full_name || ''
      const profissional = res.message.profissional || form.usr
      localStorage.setItem('frappe_user_name', fullName.split(' ')[0])
      localStorage.setItem('frappe_professional', profissional)
      setAuth(form.usr, token)

      try {
        const funcPerms = await minhasPermissoes()
        if (funcPerms?.permissoes) {
          setFuncPermissoes(funcPerms.permissoes)
        }
      } catch (e) {
        console.error('Erro ao buscar permissões de funcionário:', e)
      }

      try {
        const assinatura = await buscarAssinatura()
        if (assinatura?.plano_de_assinatura) {
          const plano = await buscarPlano(assinatura.plano_de_assinatura)
          if (plano) {
            setModulos({
              dieta:  !!plano.dieta,
              treino: !!plano.treino,
            })
          }
        }
      } catch (e) {
        console.error('Erro ao buscar módulos do plano:', e)
      }

      navigate(next && next.startsWith('/') && !next.startsWith('/aluno') ? next : '/')
    } catch (err) {
      console.log('ERRO:', err.response?.data)
      setError('Usuário ou senha incorretos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLoginAluno(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const aluno = await autenticarAluno(codigo)
      if (!aluno?.senha_de_acesso || !aluno?.name) {
        throw new Error('resposta inválida do servidor')
      }
      if (!aluno.enabled) {
        setError('Seu acesso está desativado. Fale com seu profissional.')
        return
      }
      setAuthAluno(aluno, aluno.senha_de_acesso)
      try {
        const home = await homeAluno()
        if (home?.aluno) {
          setAuthAluno({ ...aluno, ...home.aluno }, aluno.senha_de_acesso, home.profissional || null)
        }
      } catch (err) {
        console.warn('Falha ao buscar home do aluno:', err)
      }
      const lastPath = localStorage.getItem('aluno_last_path')
      const destination = (next && next.startsWith('/aluno'))
        ? next
        : (lastPath && lastPath.startsWith('/aluno') ? lastPath : '/aluno')
      navigate(destination)
    } catch (err) {
      console.log('ERRO:', err.response?.data || err.message)
      setError('Código de acesso inválido. Verifique e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className={`${tw.page} flex items-center justify-center`}>
        <p className="text-gray-500 text-sm">Verificando sessão...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-between lg:justify-center px-4 pt-16 pb-10">
      {/* Foto full-bleed */}
      <div
        className="absolute inset-0 bg-cover bg-[center_55%] bg-no-repeat"
        style={{ backgroundImage: 'url(https://shapefy.online/assets/shapefy/images/fundo-home.jpg)' }}
      />
      {/* Gradiente: transparente no topo, escuro na base */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/85" />

      {/* Título — topo */}
      <div className="relative z-10 text-center">
        <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-lg">
          Shape<span className="text-[#2563eb]">fy</span>
        </h1>
        <p className="text-gray-300 mt-2 text-sm drop-shadow font-medium">
          Plataforma de gestão para profissionais de saúde
        </p>
      </div>

      {/* Formulário — base no mobile, centralizado no desktop */}
      <div className="w-full max-w-md relative z-10">

        <div className="bg-[#0a0a0a]/80 backdrop-blur-md border border-white/10 rounded-xl p-5 shadow-xl">
          <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 border border-white/10 rounded-lg mb-5">
            <button
              type="button"
              onClick={() => { setTipo('profissional'); setError('') }}
              className={`h-10 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors
                ${tipo === 'profissional'
                  ? 'bg-[#2563eb] text-white'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              Sou profissional
            </button>
            <button
              type="button"
              onClick={() => { setTipo('aluno'); setError('') }}
              className={`h-10 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors
                ${tipo === 'aluno'
                  ? 'bg-[#2563eb] text-white'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              Sou aluno
            </button>
          </div>

          {tipo === 'profissional' ? (
            <>
              <h2 className="text-white text-lg font-semibold mb-4">Entrar na sua conta</h2>
              <form onSubmit={handleLoginProfissional} className="space-y-3">
                <Input
                  label="E-mail ou usuário"
                  type="text"
                  value={form.usr}
                  onChange={(val) => setForm({ ...form, usr: val })}
                  placeholder="seu@email.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                />
                <div className="space-y-1">
                  <div className="relative">
                    <Input
                      label="Senha"
                      type={showPwd ? 'text' : 'password'}
                      value={form.pwd}
                      onChange={(val) => setForm({ ...form, pwd: val })}
                      placeholder="••••••••"
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
                      title={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute right-3 top-[34px] text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <Link to="/forgot-password" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                      Esqueci minha senha
                    </Link>
                  </div>
                </div>

                {error && (
                  <div className={`${tw.badge.danger} rounded-lg px-4 py-3`}>
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  className="w-full mt-2"
                >
                  Entrar
                </Button>

                <a
                  href="https://shapefy.online"
                  className="w-full h-10 mt-2 rounded-lg border border-[#323238] hover:border-[#2563eb] bg-transparent hover:bg-[#2563eb]/10 text-gray-300 hover:text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <ArrowLeft size={14} /> Voltar à página inicial
                </a>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-white text-lg font-semibold mb-1">Entrar no app</h2>
              <p className="text-gray-500 text-xs mb-5">
                Use o código de acesso que seu profissional te enviou.
              </p>
              <form onSubmit={handleLoginAluno} className="space-y-3">
                <Input
                  label="Código de acesso"
                  type="text"
                  value={codigo}
                  onChange={setCodigo}
                  placeholder="Ex: abc123xyz"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                />

                {error && (
                  <div className={`${tw.badge.danger} rounded-lg px-4 py-3`}>
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  className="w-full mt-2"
                >
                  Entrar
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-gray-500 text-xs mt-5">
          © {new Date().getFullYear()} Shapefy · Todos os direitos reservados
        </p>
      </div>
    </div>
  )
}
