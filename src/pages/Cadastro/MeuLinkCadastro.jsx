import { useEffect, useState } from 'react'
import { Link2, Copy, Check, ExternalLink, QrCode, Share2, Megaphone, ShieldCheck, Sparkles } from 'lucide-react'
import { Button, Spinner, BotaoAjuda } from '../../components/ui'
import { getMeuLinkCadastro } from '../../api/meuLinkCadastro'

export default function MeuLinkCadastro() {
  const [loading, setLoading] = useState(true)
  const [slug, setSlug] = useState('')
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [showQr, setShowQr] = useState(false)

  useEffect(() => {
    let cancel = false
    setLoading(true)
    getMeuLinkCadastro()
      .then((data) => {
        if (cancel) return
        setSlug(data.slug || '')
      })
      .catch((e) => {
        console.error(e)
        setErro('Não foi possível carregar seu link de cadastro.')
      })
      .finally(() => { if (!cancel) setLoading(false) })
    return () => { cancel = true }
  }, [])

  const linkCompleto = slug ? `${window.location.origin}/cadastro/${slug}` : ''

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
              icon: Sparkles,
              title: 'Seu link é único e permanente',
              description: 'O sistema gerou um código aleatório só seu. Você pode usar o mesmo link sempre — não precisa criar um novo a cada aluno.',
            },
            {
              icon: Share2,
              title: 'Compartilhe onde quiser',
              description: 'Cole no bio do Instagram, em stories, no WhatsApp ou onde quiser captar novos alunos. Você também pode usar o QR code.',
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
          ]}
        />
      </div>

      {/* Card principal */}
      <div className="bg-[#29292e] border border-[#323238] rounded-xl overflow-hidden">

        {/* Status */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-[#323238] bg-green-500/[0.04]">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <div>
            <p className="text-white text-sm font-semibold">Aceitando cadastros</p>
            <p className="text-gray-500 text-xs">Quem acessar o link pode preencher.</p>
          </div>
        </div>

        {/* Link */}
        <div className="p-5 space-y-3">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Seu link</p>

          {erro && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {erro}
            </div>
          )}

          {linkCompleto ? (
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
          ) : (
            <div className="bg-[#1a1a1a] border border-[#323238] rounded-lg p-3 text-gray-500 text-sm">
              Nenhum link gerado ainda.
            </div>
          )}
        </div>

        {/* Ações */}
        {linkCompleto && (
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
