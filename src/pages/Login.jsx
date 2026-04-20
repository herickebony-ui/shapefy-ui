import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { login } from '../api/auth'
import { Input, Button } from '../components/ui'
import { tw } from '../styles/tokens'

export default function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({ usr: '', pwd: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
            Shape<span className="text-[#850000]">fy</span>
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

            <Input
              label="Senha"
              type="password"
              value={form.pwd}
              onChange={(val) => setForm({ ...form, pwd: val })}
              placeholder="••••••••"
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
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          © {new Date().getFullYear()} Shapefy · Todos os direitos reservados
        </p>
      </div>
    </div>
  )
}
