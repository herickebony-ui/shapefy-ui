import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { resetPassword } from '../api/auth'
import { Input, Button } from '../components/ui'
import { tw } from '../styles/tokens'
import { CheckCircle, ArrowLeft } from 'lucide-react'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await resetPassword(email)
      setDone(true)
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.exc_type || ''
      if (msg) {
        setError(msg)
      } else {
        setError('Não foi possível enviar o e-mail. Verifique o endereço e tente novamente.')
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
                <p className="text-white font-semibold text-lg">E-mail enviado!</p>
                <p className="text-gray-400 text-sm mt-1">
                  Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                </p>
              </div>
              <Button variant="ghost" size="md" className="w-full mt-2" onClick={() => navigate('/login')}>
                Voltar ao login
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-white text-xl font-semibold mb-2">Esqueci minha senha</h2>
              <p className="text-gray-400 text-sm mb-6">
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="E-mail"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="seu@email.com"
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
                  Enviar link
                </Button>
              </form>

              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-1.5 mt-5 text-gray-500 hover:text-gray-300 text-sm transition-colors mx-auto"
              >
                <ArrowLeft size={14} />
                Voltar ao login
              </button>
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
