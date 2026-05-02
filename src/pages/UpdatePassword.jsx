import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { updatePassword } from '../api/auth'
import { Input, Button } from '../components/ui'
import { tw } from '../styles/tokens'
import { CheckCircle } from 'lucide-react'

export default function UpdatePassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const key = searchParams.get('key')

  const [form, setForm] = useState({ password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) {
      setError('As senhas não coincidem.')
      return
    }
    if (form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setLoading(true)
    try {
      await updatePassword(key, form.password)
      setDone(true)
    } catch (err) {
      const status = err.response?.status
      const msg = err.response?.data?.message || err.response?.data?.exc_type || ''
      if (status === 410) {
        setError('Este link de definição de senha expirou. Solicite um novo acesso.')
      } else if (msg) {
        setError(msg)
      } else {
        setError('Não foi possível definir a senha. Tente novamente.')
      }
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`${tw.page} flex items-center justify-center px-4`}>
      <div className="w-full max-w-md">

        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Shape<span className="text-brand">fy</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            Plataforma de gestão para profissionais de saúde
          </p>
        </div>

        <div className={`${tw.card} p-8 shadow-xl`}>
          {done ? (
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <CheckCircle size={40} className="text-green-400" />
              <div>
                <p className="text-white font-semibold text-lg">Senha definida!</p>
                <p className="text-gray-400 text-sm mt-1">
                  Sua senha foi criada com sucesso. Você já pode fazer login.
                </p>
              </div>
              <Button variant="primary" size="lg" className="w-full mt-2" onClick={() => navigate('/login')}>
                Ir para o login
              </Button>
            </div>
          ) : !key ? (
            <div className="text-center py-4">
              <p className="text-white font-semibold">Link inválido</p>
              <p className="text-gray-400 text-sm mt-2">
                O link de boas-vindas está incompleto. Verifique o e-mail recebido.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-white text-xl font-semibold mb-2">Bem-vindo(a)!</h2>
              <p className="text-gray-400 text-sm mb-6">
                Defina sua senha para acessar a plataforma.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Nova senha"
                  type="password"
                  value={form.password}
                  onChange={(val) => setForm({ ...form, password: val })}
                  placeholder="••••••••"
                  required
                />

                <Input
                  label="Confirmar senha"
                  type="password"
                  value={form.confirm}
                  onChange={(val) => setForm({ ...form, confirm: val })}
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
                  Definir senha
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          © {new Date().getFullYear()} Shapefy · Todos os direitos reservados
        </p>
      </div>
    </div>
  )
}
