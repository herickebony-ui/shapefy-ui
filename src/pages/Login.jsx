import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { login } from '../api/auth'

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
    const { api_key, api_secret } = res.message
    const token = `${api_key}:${api_secret}`
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
    <div className="min-h-screen bg-[#202024] flex items-center justify-center px-4">
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
        <div className="bg-[#29292e] border border-[#323238] rounded-xl p-8 shadow-xl">
          <h2 className="text-white text-xl font-semibold mb-6">
            Entrar na sua conta
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                required
                value={form.usr}
                onChange={(e) => setForm({ ...form, usr: e.target.value })}
                placeholder="seu@email.com"
                className="w-full bg-[#1a1a1a] border border-[#323238] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#850000] transition-colors"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1.5">
                Senha
              </label>
              <input
                type="password"
                required
                value={form.pwd}
                onChange={(e) => setForm({ ...form, pwd: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-[#1a1a1a] border border-[#323238] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#850000] transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#850000] hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors mt-2"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          © {new Date().getFullYear()} Shapefy · Todos os direitos reservados
        </p>
      </div>
    </div>
  )
}