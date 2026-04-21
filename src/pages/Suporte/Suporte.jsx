import { Mail, Clock } from 'lucide-react'
import ListPage from '../../components/templates/ListPage'
import { Button } from '../../components/ui'

export default function Suporte() {
  return (
    <ListPage
      title="Suporte"
      subtitle="Fale com o time Shapefy"
    >
      <div className="px-4 md:px-6 pb-6 space-y-4">
        <div className="bg-[#29292e] border border-[#323238] rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Mail size={15} className="text-brand" />
            Contato rápido
          </div>
          <p className="text-gray-400 text-sm">
            Use estes canais para falar com o time do Shapefy sobre dúvidas do painel, assinatura ou problemas técnicos.
          </p>
          <Button
            variant="primary"
            size="sm"
            icon={Mail}
            onClick={() => window.location.href = 'mailto:suporte@shapefyapp.com'}
          >
            Enviar e-mail
          </Button>
          <div className="flex items-start gap-2 text-gray-500 text-xs pt-1">
            <Clock size={13} className="mt-0.5 shrink-0" />
            <span>Horário de atendimento: Segunda a sexta, das 9h às 18h (horário de Brasília)</span>
          </div>
        </div>
      </div>
    </ListPage>
  )
}
