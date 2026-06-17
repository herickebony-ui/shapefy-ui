// Modal padrão para exibir erros vindos do Frappe (ou outros).
// Recebe { detail } no formato de `parseFrappeErrorDetail`:
//   { type, title, messages[], statusCode }
//
// Para usar com pouco boilerplate, prefira o hook `useErrorModal`.
import { AlertCircle, AlertTriangle, ShieldAlert, WifiOff, Server, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import Modal from './Modal'
import Button from './Button'

const TYPE_STYLES = {
  mandatory:  { Icon: AlertTriangle, color: 'text-amber-400',  ring: 'bg-amber-500/15  border-amber-500/40' },
  validation: { Icon: AlertCircle,   color: 'text-amber-400',  ring: 'bg-amber-500/15  border-amber-500/40' },
  link:       { Icon: AlertCircle,   color: 'text-amber-400',  ring: 'bg-amber-500/15  border-amber-500/40' },
  duplicate:  { Icon: AlertCircle,   color: 'text-amber-400',  ring: 'bg-amber-500/15  border-amber-500/40' },
  timestamp:  { Icon: AlertCircle,   color: 'text-amber-400',  ring: 'bg-amber-500/15  border-amber-500/40' },
  permission: { Icon: ShieldAlert,   color: 'text-red-400',    ring: 'bg-red-500/15    border-red-500/40' },
  network:    { Icon: WifiOff,       color: 'text-red-400',    ring: 'bg-red-500/15    border-red-500/40' },
  server:     { Icon: Server,        color: 'text-red-400',    ring: 'bg-red-500/15    border-red-500/40' },
  unknown:    { Icon: AlertCircle,   color: 'text-red-400',    ring: 'bg-red-500/15    border-red-500/40' },
}

const HINTS = {
  mandatory:  'Preencha os campos destacados e tente salvar de novo.',
  validation: 'O backend rejeitou os dados. Revise as informações abaixo.',
  link:       'Um dos vínculos aponta para um registro que não existe mais.',
  duplicate:  'Já existe um registro com esses dados. Edite o existente ou altere os campos únicos.',
  timestamp:  'Outra pessoa editou esse documento. Recarregue a página e tente novamente.',
  permission: 'Sua conta não tem permissão para essa operação. Fale com o administrador.',
  network:    'Verifique sua conexão e tente novamente.',
  server:     'O servidor retornou um erro. Tente novamente em alguns instantes.',
  unknown:    '',
}

export default function ErrorModal({ open, onClose, detail, context }) {
  const [copied, setCopied] = useState(false)
  if (!open || !detail) return null

  const { type = 'unknown', title, messages = [], statusCode } = detail
  const style = TYPE_STYLES[type] || TYPE_STYLES.unknown
  const Icon = style.Icon
  const hint = HINTS[type]

  const copyAll = async () => {
    const text = [
      context && `Contexto: ${context}`,
      `Tipo: ${type}${statusCode ? ` (HTTP ${statusCode})` : ''}`,
      '',
      ...messages.map((m, i) => `${i + 1}. ${m}`),
    ].filter(Boolean).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <Modal
      open
      overlay
      onClose={onClose}
      size="md"
      title={title}
      subtitle={context}
      footer={
        <>
          <Button variant="ghost" size="sm" icon={copied ? Check : Copy} onClick={copyAll}>
            {copied ? 'Copiado' : 'Copiar detalhes'}
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>Entendi</Button>
        </>
      }
    >
      <div className="p-4 md:p-5 space-y-4">
        <div className={`flex gap-3 p-3 rounded-xl border ${style.ring}`}>
          <Icon size={20} className={`shrink-0 mt-0.5 ${style.color}`} />
          <p className="text-sm text-gray-200 leading-relaxed">
            {hint || 'Veja abaixo o detalhe retornado pelo servidor.'}
          </p>
        </div>

        <ul className="space-y-2">
          {messages.map((msg, i) => (
            <li
              key={i}
              className="flex gap-2 text-sm text-white bg-[#1a1a1a] border border-[#323238] rounded-lg px-3 py-2"
            >
              <span className="text-gray-500 font-semibold shrink-0">{i + 1}.</span>
              <span className="break-words">{msg}</span>
            </li>
          ))}
        </ul>

        {statusCode > 0 && (
          <p className="text-[11px] text-gray-500 font-medium tracking-wider uppercase">
            HTTP {statusCode}{type !== 'unknown' && ` · ${type}`}
          </p>
        )}
      </div>
    </Modal>
  )
}
