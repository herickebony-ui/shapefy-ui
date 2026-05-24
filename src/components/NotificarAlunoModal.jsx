// Modal de notificação ao salvar dieta/treino/prescrição.
// O modal NÃO chama a API — só dispara callbacks. O caller controla:
//   - onConfirm(agendado_para)  → save (e talvez notifica)
//       agendado_para = null   → save + notifica imediato
//       agendado_para = string → save + notifica agendado pra esse horário
//       agendado_para = false  → save SEM notificar
//   - onClose()                 → cancela tudo (fecha modal, NÃO salva)
//
// Props:
//   open: bool
//   onClose: () => void                 (cancela — modal fecha sem salvar)
//   onConfirm: (agendado_para) => void  (caller salva e, conforme valor, notifica ou não)
//   loading: bool                       (caller controla loading durante save)
//   tipo: 'treino' | 'dieta' | 'prescricao'
//   alunoNome?: string
import { useEffect, useState } from 'react'
import { Bell, Calendar, Smartphone, Mail, MessageCircle } from 'lucide-react'
import { Modal, Button, FormGroup, Input } from './ui'

const PERGUNTA = {
  treino: 'Notificar sobre o treino?',
  dieta: 'Notificar sobre a dieta?',
  prescricao: 'Notificar sobre a prescrição?',
}

const padZero = (n) => String(n).padStart(2, '0')
const hoje = () => {
  const d = new Date()
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`
}

export default function NotificarAlunoModal({ open, onClose, onConfirm, loading = false, tipo = 'treino', alunoNome }) {
  const [view, setView] = useState('inicio')
  const [data, setData] = useState(hoje())
  const [hora, setHora] = useState('21:00')

  // Reseta o view quando o modal abre de novo
  useEffect(() => {
    if (open) setView('inicio')
  }, [open])

  if (!open) return null

  const handleNotificarAgora = () => onConfirm(null)
  const handleSalvarSemNotificar = () => onConfirm(false)
  const handleConfirmarAgendado = () => {
    if (!data || !hora) return
    onConfirm(`${data} ${hora}:00`)
  }

  return (
    <Modal isOpen onClose={onClose} size="sm" closeOnOverlayClick={!loading}>
      <div className="px-6 pt-6 pb-5 flex flex-col items-center text-center">
        <div className="h-14 w-14 flex items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
          <Bell size={22} className="text-red-400" />
        </div>
        <h3 className="mt-4 text-white text-lg font-bold leading-tight">
          {PERGUNTA[tipo] || 'Notificar?'}
        </h3>
        {alunoNome && (
          <p className="mt-1 text-gray-500 text-xs">Aluno: <span className="text-gray-300">{alunoNome}</span></p>
        )}

        {view === 'inicio' ? (
          <>
            <p className="mt-3 text-gray-400 text-sm leading-relaxed">
              O aluno recebe um aviso no app dele.
            </p>
            <p className="mt-1 text-[11px] text-gray-600">
              <span className="text-yellow-400">Cancelar</span> não salva.
              {' '}
              <span className="text-gray-400">Salvar sem notificar</span>, <span className="text-gray-400">Notificar</span> e <span className="text-gray-400">Agendar</span> salvam.
            </p>

            <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-gray-500">
              <span className="flex items-center gap-1"><Smartphone size={11} /> Push</span>
              <span className="flex items-center gap-1"><Mail size={11} /> E-mail</span>
              <span className="flex items-center gap-1 opacity-60">
                <MessageCircle size={11} /> WhatsApp <span className="ml-0.5 text-[9px] text-yellow-400 uppercase tracking-wider">em breve</span>
              </span>
            </div>

            <div className="w-full mt-6 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
                <Button variant="danger" loading={loading} onClick={handleNotificarAgora}>Notificar</Button>
              </div>
              <Button variant="secondary" onClick={handleSalvarSemNotificar} disabled={loading} fullWidth>
                Salvar sem notificar
              </Button>
              <Button variant="secondary" icon={Calendar} onClick={() => setView('agendar')} disabled={loading} fullWidth>
                Agendar notificação
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="w-full mt-6 grid grid-cols-2 gap-3 text-left">
              <FormGroup label="Data">
                <Input type="date" value={data} onChange={setData} />
              </FormGroup>
              <FormGroup label="Hora">
                <Input type="time" value={hora} onChange={setHora} />
              </FormGroup>
            </div>
            <p className="mt-2 text-[11px] text-gray-600 self-start">
              O scheduler roda a cada 5 minutos, então pode haver pequeno atraso após o horário escolhido.
            </p>
            <div className="w-full mt-5 grid grid-cols-2 gap-2">
              <Button variant="ghost" onClick={() => setView('inicio')} disabled={loading}>Voltar</Button>
              <Button variant="danger" loading={loading} disabled={!data || !hora} onClick={handleConfirmarAgendado}>
                Confirmar
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
