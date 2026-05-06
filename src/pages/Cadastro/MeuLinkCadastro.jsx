import { useEffect, useState } from 'react'
import { Link2, Copy, Check, ExternalLink, ToggleRight, ToggleLeft, Save, QrCode, Share2, Megaphone, ShieldCheck } from 'lucide-react'
import { Button, FormGroup, Input, Spinner, BotaoAjuda } from '../../components/ui'
import { getMeuLinkCadastro, salvarMeuLinkCadastro } from '../../api/meuLinkCadastro'

const SLUG_REGEX = /^[a-z0-9-]{4,32}$/

const sanitizeSlug = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 32)

export default function MeuLinkCadastro() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [slug, setSlug] = useState('')
  const [slugOriginal, setSlugOriginal] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [showQr, setShowQr] = useState(false)

  useEffect(() => {
    let cancel = false
    setLoading(true)
    getMeuLinkCadastro()
      .then((data) => {
        if (cancel) return
        const s = data.slug || data.sugestao_slug || ''
        setSlug(s)
        setSlugOriginal(data.slug || '')
        setAtivo(data.ativo === undefined ? true : !!data.ativo)
      })
      .catch((e) => {
        console.error(e)
        setErro('Não foi possível carregar a configuração do link.')
      })
      .finally(() => { if (!cancel) setLoading(false) })
    return () => { cancel = true }
  }, [])

  const linkCompleto = slug ? `${window.location.origin}/cadastro/${slug}` : ''
  const slugMudou = slug !== slugOriginal
  const slugValido = SLUG_REGEX.test(slug)
  const podeSalvar = slugValido && (slugMudou || ativo !== (slugOriginal ? true : true))

  const handleSlugChange = (v) => {
    setSlug(sanitizeSlug(v))
    setErro('')
  }

  const handleSalvar = async () => {
    if (!slugValido) {
      setErro('Slug inválido. Use 4 a 32 caracteres: a-z, 0-9 e hífen.')
      return
    }
    setSaving(true)
    setErro('')
    try {
      const res = await salvarMeuLinkCadastro({ slug, ativo })
      setSlug(res.slug || slug)
      setSlugOriginal(res.slug || slug)
      setAtivo(res.ativo === undefined ? ativo : !!res.ativo)
    } catch (e) {
      const msg = String(e?.response?.data?.message?.erro || e?.message || '')
      if (msg.includes('slug_duplicado')) {
        setErro('Esse endereço já está em uso por outro profissional. Escolha outro.')
      } else if (msg.includes('slug_invalido')) {
        setErro('Slug inválido. Use 4 a 32 caracteres: a-z, 0-9 e hífen.')
      } else {
        setErro('Não foi possível salvar. Tente novamente.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleToggleAtivo = async () => {
    if (!slugOriginal) return
    const novoAtivo = !ativo
    setAtivo(novoAtivo)
    try {
      await salvarMeuLinkCadastro({ slug: slugOriginal, ativo: novoAtivo })
    } catch (e) {
      setAtivo(ativo)
      setErro('Não foi possível atualizar o status.')
    }
  }

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(linkCompleto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1800)
    } catch {
      setErro('Não foi possível copiar.')
    }
  }

  const handleCompartilhar = async () => {
    if (!navigator.share) return handleCopiar()
    try {
      await navigator.share({
        title: 'Cadastro de aluno',
        text: 'Preencha seu cadastro para iniciarmos a consultoria:',
        url: linkCompleto,
      })
    } catch { /* user cancelled */ }
  }

  if (loading) {
    return <Spinner size={28} />
  }

  const qrUrl = linkCompleto
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=${encodeURIComponent(linkCompleto)}`
    : ''

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Link2 size={20} className="text-[#2563eb]" />
            Meu link de cadastro
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Compartilhe este link e novos alunos cadastram seus dados sozinhos.
          </p>
        </div>
        <BotaoAjuda
          title="Como funciona o link de cadastro"
          subtitle="Ficha de cadastro automática para novos alunos"
          topicos={[
            {
              icon: Share2,
              title: 'Compartilhe seu link',
              description: 'Cole o link no bio do Instagram, em stories, no WhatsApp ou onde quiser captar novos alunos. Você também pode usar o QR code.',
            },
            {
              icon: Megaphone,
              title: 'O aluno preenche os dados',
              description: 'Ao acessar, ele vê uma ficha bonitinha com seu nome e foto. Preenche nome, contato, CPF, endereço (com CEP automático) e e-mail.',
            },
            {
              icon: ShieldCheck,
              title: 'Você é notificado',
              description: 'Assim que enviado, o aluno entra automaticamente na sua lista de "Meus Alunos" e você recebe uma notificação no sininho.',
            },
            {
              icon: ToggleLeft,
              title: 'Pause quando quiser',
              description: 'Desative o link a qualquer momento. Quem acessar verá a mensagem "Cadastros encerrados" sem conseguir enviar dados.',
            },
          ]}
        />
      </div>

      {/* Card principal */}
      <div className="bg-[#29292e] border border-[#323238] rounded-xl overflow-hidden">

        {/* Status / toggle */}
        <div className={`px-5 py-4 flex items-center justify-between border-b border-[#323238] ${ativo ? 'bg-green-500/[0.04]' : 'bg-[#1a1a1a]'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${ativo ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
            <div>
              <p className="text-white text-sm font-semibold">
                {ativo ? 'Aceitando cadastros' : 'Cadastros desativados'}
              </p>
              <p className="text-gray-500 text-xs">
                {ativo ? 'Quem acessar o link pode preencher.' : 'Quem acessar verá uma mensagem de cadastros encerrados.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleAtivo}
            disabled={!slugOriginal}
            title={ativo ? 'Desativar' : 'Ativar'}
            className={`h-9 px-3 flex items-center gap-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              ativo
                ? 'text-green-400 border-green-500/30 hover:bg-green-700 hover:border-green-700 hover:text-white'
                : 'text-gray-500 border-[#323238] hover:border-gray-500 hover:text-white'
            }`}
          >
            {ativo ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            <span className="text-xs font-medium">{ativo ? 'Ativo' : 'Inativo'}</span>
          </button>
        </div>

        {/* Slug + link */}
        <div className="p-5 space-y-4">

          <FormGroup
            label="Endereço do seu link"
            hint="Use letras minúsculas, números e hífen (4 a 32 caracteres). Ex: herick-ebony"
            error={erro}
          >
            <div className="flex gap-2">
              <div className="hidden sm:flex h-10 px-3 items-center bg-[#1a1a1a] border border-[#323238] rounded-lg text-gray-500 text-xs whitespace-nowrap">
                {window.location.origin.replace(/^https?:\/\//, '')}/cadastro/
              </div>
              <Input
                value={slug}
                onChange={handleSlugChange}
                placeholder="seu-nome"
                className="flex-1"
              />
            </div>
          </FormGroup>

          {linkCompleto && (
            <div className="bg-[#1a1a1a] border border-[#323238] rounded-lg p-3 flex items-center gap-2 overflow-hidden">
              <Link2 size={14} className="text-[#2563eb] shrink-0" />
              <a
                href={linkCompleto}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm truncate flex-1"
              >
                {linkCompleto}
              </a>
            </div>
          )}

          {slugMudou && (
            <Button
              variant="primary"
              size="md"
              icon={Save}
              onClick={handleSalvar}
              loading={saving}
              fullWidth
            >
              Salvar alterações
            </Button>
          )}
        </div>

        {/* Ações */}
        {slugOriginal && (
          <div className="border-t border-[#323238] p-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button variant="secondary" size="sm" icon={copiado ? Check : Copy} onClick={handleCopiar}>
              {copiado ? 'Copiado!' : 'Copiar'}
            </Button>
            <Button variant="secondary" size="sm" icon={Share2} onClick={handleCompartilhar}>
              Compartilhar
            </Button>
            <Button variant="secondary" size="sm" icon={QrCode} onClick={() => setShowQr(s => !s)}>
              QR Code
            </Button>
            <Button variant="secondary" size="sm" icon={ExternalLink} onClick={() => window.open(linkCompleto, '_blank')}>
              Visualizar
            </Button>
          </div>
        )}

        {showQr && qrUrl && (
          <div className="border-t border-[#323238] p-5 flex flex-col items-center gap-3 bg-[#1a1a1a]">
            <img src={qrUrl} alt="QR Code do link de cadastro" className="rounded-lg bg-white p-2" />
            <p className="text-gray-500 text-xs text-center">
              Aponte a câmera do celular para escanear
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
