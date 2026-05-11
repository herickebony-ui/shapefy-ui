import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { login } from '../api/auth'
import { buscarAssinatura, buscarPlano } from '../api/assinatura'
import { Input, Button } from '../components/ui'
import { tw } from '../styles/tokens'

export default function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const setModulos = useAuthStore((s) => s.setModulos)
  const [form, setForm] = useState({ usr: '', pwd: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await login(form.usr, form.pwd)
      const token = res.message.token
      const fullName = res.message.full_name || ''
      localStorage.setItem('frappe_user_name', fullName.split(' ')[0])
      setAuth(form.usr, token)

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

      navigate('/')
    } catch (err) {
      console.log('ERRO:', err.response?.data)
      setError('E-mail ou senha incorretos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`${tw.page} flex items-center justify-center px-4`}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Shape<span className="text-[#2563eb]">fy</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            Plataforma de gestão para profissionais de saúde
          </p>
        </div>

        {/* Card */}
        <div className={`${tw.card} p-8 shadow-xl`}>
          <h2 className="text-white text-xl font-semibold mb-6">
            Entrar na sua conta
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              value={form.usr}
              onChange={(val) => setForm({ ...form, usr: val })}
              placeholder="seu@email.com"
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
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          © {new Date().getFullYear()} Shapefy · Todos os direitos reservados
        </p>
      </div>
    </div>
  )
}
