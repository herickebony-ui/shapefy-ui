import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, AlertCircle, MapPin, User } from 'lucide-react'
import { Button, FormGroup, Input, Spinner } from '../../components/ui'
import { getProfissionalPorSlug, enviarCadastroPublico, buscarCep } from '../../api/cadastroPublico'
import { tw } from '../../styles/tokens'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

const maskCelular = (v) => {
  const d = String(v || '').replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

const maskCpf = (v) => {
  const d = String(v || '').replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

const maskCep = (v) => {
  const d = String(v || '').replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

const validarCpf = (cpf) => {
  const d = String(cpf || '').replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false
  let s = 0
  for (let i = 0; i < 9; i++) s += parseInt(d[i]) * (10 - i)
  let r = (s * 10) % 11
  if (r === 10) r = 0
  if (r !== parseInt(d[9])) return false
  s = 0
  for (let i = 0; i < 10; i++) s += parseInt(d[i]) * (11 - i)
  r = (s * 10) % 11
  if (r === 10) r = 0
  return r === parseInt(d[10])
}

const validarEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || ''))

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export default function CadastroPublico() {
  const { slug } = useParams()
  const [loading, setLoading] = useState(true)
  const [profissional, setProfissional] = useState(null)
  const [erroLink, setErroLink] = useState('')

  const [form, setForm] = useState({
    nome_completo: '',
    celular: '',
    whatsapp: true,
    cpf: '',
    data_nascimento: '',
    profissao: '',
    cep: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    uf: '',
    email: '',
  })
  const [erros, setErros] = useState({})
  const [cepLoading, setCepLoading] = useState(false)
  const [cepErro, setCepErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')
  const cepDebounce = useRef(null)

  useEffect(() => {
    let cancel = false
    setLoading(true)
    setErroLink('')
    getProfissionalPorSlug(slug)
      .then((data) => {
        if (cancel) return
        if (!data) {
          setErroLink('nao_encontrado')
          setProfissional(null)
        } else if (!data.ativo) {
          setErroLink('inativo')
          setProfissional(data)
        } else {
          setProfissional(data)
        }
      })
      .catch(() => {
        if (cancel) return
        setErroLink('erro')
      })
      .finally(() => { if (!cancel) setLoading(false) })
    return () => { cancel = true }
  }, [slug])

  const setCampo = (campo) => (val) => {
    setForm(prev => ({ ...prev, [campo]: val }))
    if (erros[campo]) setErros(prev => ({ ...prev, [campo]: undefined }))
  }

  const handleCep = (raw) => {
    const masked = maskCep(raw)
    setForm(prev => ({ ...prev, cep: masked }))
    setCepErro('')
    clearTimeout(cepDebounce.current)
    const digits = masked.replace(/\D/g, '')
    if (digits.length === 8) {
      cepDebounce.current = setTimeout(async () => {
        setCepLoading(true)
        const res = await buscarCep(digits)
        setCepLoading(false)
        if (!res) {
          setCepErro('CEP não encontrado')
          return
        }
        setForm(prev => ({
          ...prev,
          rua: res.logradouro || prev.rua,
          bairro: res.bairro || prev.bairro,
          cidade: res.cidade || prev.cidade,
          uf: res.uf || prev.uf,
        }))
      }, 300)
    }
  }

  const validar = () => {
    const e = {}
    if (!form.nome_completo.trim()) e.nome_completo = 'Obrigatório'
    if (form.celular.replace(/\D/g, '').length < 10) e.celular = 'Celular incompleto'
    if (!validarCpf(form.cpf)) e.cpf = 'CPF inválido'
    if (!form.data_nascimento) e.data_nascimento = 'Obrigatório'
    if (!form.profissao.trim()) e.profissao = 'Obrigatório'
    if (form.cep.replace(/\D/g, '').length !== 8) e.cep = 'CEP inválido'
    if (!form.rua.trim()) e.rua = 'Obrigatório'
    if (!form.numero.trim()) e.numero = 'Obrigatório'
    if (!form.bairro.trim()) e.bairro = 'Obrigatório'
    if (!form.cidade.trim()) e.cidade = 'Obrigatório'
    if (!form.uf.trim()) e.uf = 'Obrigatório'
    if (!validarEmail(form.email)) e.email = 'E-mail inválido'
    setErros(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    setErroEnvio('')
    if (!validar()) return
    setEnviando(true)
    try {
      await enviarCadastroPublico(slug, {
        nome_completo: form.nome_completo.trim(),
        celular: form.celular.replace(/\D/g, ''),
        whatsapp: form.whatsapp ? 1 : 0,
        cpf: form.cpf.replace(/\D/g, ''),
        data_nascimento: form.data_nascimento,
        profissao: form.profissao.trim(),
        cep: form.cep.replace(/\D/g, ''),
        rua: form.rua.trim(),
        numero: form.numero.trim(),
        bairro: form.bairro.trim(),
        cidade: form.cidade.trim(),
        uf: form.uf.trim().toUpperCase(),
        email: form.email.trim().toLowerCase(),
      })
      setEnviado(true)
    } catch (err) {
      const msg = String(err?.message || '')
      if (msg.includes('cpf_duplicado')) {
        setErroEnvio('Você já está cadastrado com este CPF. Entre em contato com o profissional.')
      } else if (msg.includes('link_inativo')) {
        setErroEnvio('Os cadastros foram encerrados pelo profissional.')
        setErroLink('inativo')
      } else {
        setErroEnvio('Não foi possível enviar o cadastro. Tente novamente em instantes.')
      }
    } finally {
      setEnviando(false)
    }
  }

  // ─── Estados de tela ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={`${tw.page} flex items-center justify-center px-4`}>
        <Spinner size={28} />
      </div>
    )
  }

  if (erroLink === 'nao_encontrado') {
    return (
      <div className={`${tw.page} flex items-center justify-center px-4`}>
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-xl bg-[#0052cc]/15 border border-[#0052cc]/40 text-[#60a5fa] flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={28} />
          </div>
          <h1 className="text-white text-2xl font-bold mb-2">Link não encontrado</h1>
          <p className="text-gray-400 text-sm">Confira o endereço com o profissional que enviou o link.</p>
        </div>
      </div>
    )
  }

  if (erroLink === 'inativo') {
    return (
      <div className={`${tw.page} flex items-center justify-center px-4`}>
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-xl bg-yellow-500/15 border border-yellow-500/40 text-yellow-400 flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={28} />
          </div>
          <h1 className="text-white text-2xl font-bold mb-2">Cadastros encerrados</h1>
          <p className="text-gray-400 text-sm">
            {profissional?.nome ? `${profissional.nome} não está aceitando novos cadastros no momento.` : 'O profissional não está aceitando novos cadastros no momento.'}
          </p>
        </div>
      </div>
    )
  }

  if (erroLink === 'erro') {
    return (
      <div className={`${tw.page} flex items-center justify-center px-4`}>
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={28} />
          </div>
          <h1 className="text-white text-2xl font-bold mb-2">Erro de conexão</h1>
          <p className="text-gray-400 text-sm mb-5">Não conseguimos carregar o link agora.</p>
          <Button variant="primary" onClick={() => window.location.reload()}>Tentar novamente</Button>
        </div>
      </div>
    )
  }

  if (enviado) {
    return (
      <div className={`${tw.page} flex items-center justify-center px-4`}>
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-xl bg-green-500/15 border border-green-500/40 text-green-400 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={28} />
          </div>
          <h1 className="text-white text-2xl font-bold mb-2">Cadastro enviado!</h1>
          <p className="text-gray-400 text-sm">
            {profissional?.nome
              ? `Seus dados foram enviados para ${profissional.nome}. Em breve você receberá novidades.`
              : 'Seus dados foram enviados ao profissional. Em breve você receberá novidades.'}
          </p>
        </div>
      </div>
    )
  }

  // ─── Form ───────────────────────────────────────────────────────────

  const fotoUrl = profissional?.foto ? (profissional.foto.startsWith('http') ? profissional.foto : `${FRAPPE_URL}${profissional.foto}`) : null

  return (
    <div className={`${tw.page} px-4 py-8 md:py-12`}>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          {fotoUrl ? (
            <img
              src={fotoUrl}
              alt={profissional?.nome || ''}
              className="w-20 h-20 rounded-xl object-cover mx-auto mb-4 border border-[#323238]"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-[#29292e] border border-[#323238] text-gray-500 flex items-center justify-center mx-auto mb-4">
              <User size={32} />
            </div>
          )}
          <h1 className="text-white text-2xl md:text-3xl font-bold tracking-tight">
            Ficha de Cadastro
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {profissional?.nome ? `Preencha seus dados para iniciar com ${profissional.nome}` : 'Preencha seus dados para iniciar a consultoria'}
          </p>
        </div>

        {/* Card form */}
        <form onSubmit={handleSubmit} className={`${tw.card} p-6 md:p-8 space-y-5`} noValidate>

          <FormGroup label="Nome completo" required error={erros.nome_completo}>
            <Input value={form.nome_completo} onChange={setCampo('nome_completo')} placeholder="Seu nome completo" />
          </FormGroup>

          <div>
            <FormGroup label="Celular (login e SMS)" required error={erros.celular}>
              <Input
                value={form.celular}
                onChange={(v) => setForm(prev => ({ ...prev, celular: maskCelular(v) }))}
                placeholder="(00) 90000-0000"
                type="tel"
                inputMode="tel"
              />
            </FormGroup>
            <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.whatsapp}
                onChange={(e) => setForm(prev => ({ ...prev, whatsapp: e.target.checked }))}
                className="accent-[#2563eb] w-4 h-4"
              />
              <span className="text-xs text-gray-400">Este número também é meu WhatsApp</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormGroup label="CPF" required error={erros.cpf}>
              <Input
                value={form.cpf}
                onChange={(v) => setForm(prev => ({ ...prev, cpf: maskCpf(v) }))}
                placeholder="000.000.000-00"
                inputMode="numeric"
              />
            </FormGroup>
            <FormGroup label="Data de nascimento" required error={erros.data_nascimento}>
              <Input value={form.data_nascimento} onChange={setCampo('data_nascimento')} type="date" />
            </FormGroup>
          </div>

          <FormGroup label="Profissão" required error={erros.profissao}>
            <Input value={form.profissao} onChange={setCampo('profissao')} placeholder="Sua profissão" />
          </FormGroup>

          {/* Endereço */}
          <fieldset className="rounded-xl border border-[#323238] p-4 space-y-4">
            <legend className="px-2 text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={12} /> Endereço (busca automática)
            </legend>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormGroup label="CEP" required error={erros.cep || cepErro}>
                <div className="relative">
                  <Input
                    value={form.cep}
                    onChange={handleCep}
                    placeholder="00000-000"
                    inputMode="numeric"
                  />
                  {cepLoading && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              </FormGroup>
              <div className="md:col-span-2">
                <FormGroup label="Rua" required error={erros.rua}>
                  <Input value={form.rua} onChange={setCampo('rua')} placeholder="Rua, Avenida..." />
                </FormGroup>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormGroup label="Número" required error={erros.numero}>
                <Input value={form.numero} onChange={setCampo('numero')} placeholder="123" inputMode="numeric" />
              </FormGroup>
              <div className="md:col-span-2">
                <FormGroup label="Bairro" required error={erros.bairro}>
                  <Input value={form.bairro} onChange={setCampo('bairro')} placeholder="Bairro" />
                </FormGroup>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <FormGroup label="Cidade" required error={erros.cidade}>
                  <Input value={form.cidade} onChange={setCampo('cidade')} placeholder="Cidade" />
                </FormGroup>
              </div>
              <FormGroup label="UF" required error={erros.uf}>
                <select
                  value={form.uf}
                  onChange={(e) => setCampo('uf')(e.target.value)}
                  className="w-full h-10 bg-[#1a1a1a] border border-[#323238] rounded-lg px-3 text-white text-sm outline-none focus:border-[#2563eb]/60"
                >
                  <option value="">UF</option>
                  {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </FormGroup>
            </div>
          </fieldset>

          <FormGroup label="E-mail" required error={erros.email}>
            <Input
              value={form.email}
              onChange={setCampo('email')}
              placeholder="seu@email.com"
              type="email"
              inputMode="email"
            />
          </FormGroup>

          {erroEnvio && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {erroEnvio}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={enviando}
            fullWidth
          >
            Enviar Cadastro
          </Button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-6">
          Plataforma Shapefy · Seus dados são protegidos
        </p>
      </div>
    </div>
  )
}
