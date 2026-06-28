import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Pencil, User, Mail, Phone, Calendar, Ruler, Scale,
  Activity, Target, MapPin, Briefcase, AtSign, Heart, Pill,
  Dumbbell, Apple, CheckCircle2, XCircle, IdCard,
} from 'lucide-react'
import { Spinner } from '../../components/ui'
import { GlassCard, SectionHeader, ActionButton } from '../../components/aluno'
import { perfilAluno } from '../../api/aluno'
import useErrorModal from '../../hooks/useErrorModal'
import useAuthSrc from '../../hooks/useAuthSrc'

const fmtDataBR = (d) => {
  if (!d) return ''
  const partes = String(d).split(/[T ]/)[0].split('-')
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

const iniciais = (nome) =>
  (nome || '').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'A'

function InfoRow({ icon, label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="w-8 h-8 rounded-lg border border-[var(--sf-border)] bg-[var(--sf-bg)] flex items-center justify-center text-[#60A5FA] shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-[#60A5FA] text-[10px] font-bold uppercase"
          style={{ letterSpacing: '0.18em' }}
        >
          {label}
        </p>
        <p className="text-white text-sm font-semibold mt-0.5 break-words">{value}</p>
      </div>
    </div>
  )
}

function AcessoRow({ icon, label, ativo }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-8 h-8 rounded-lg border border-[var(--sf-border)] bg-[var(--sf-bg)] flex items-center justify-center text-[#60A5FA] shrink-0">
        {icon}
      </div>
      <p className="text-white text-sm font-semibold flex-1">{label}</p>
      {ativo ? (
        <span className="flex items-center gap-1.5 text-[#22C55E] text-xs font-bold">
          <CheckCircle2 size={14} />
          Liberado
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-[var(--sf-text-soft)] text-xs font-bold">
          <XCircle size={14} />
          Indisponível
        </span>
      )}
    </div>
  )
}

export default function PerfilAluno() {
  const navigate = useNavigate()
  const errorModal = useErrorModal()
  const errorModalRef = useRef(errorModal)
  useEffect(() => { errorModalRef.current = errorModal }, [errorModal])

  const [perfil, setPerfil] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let cancelado = false
    perfilAluno()
      .then(res => { if (!cancelado) setPerfil(res) })
      .catch(err => !cancelado && errorModalRef.current.show(err, 'Perfil'))
      .finally(() => !cancelado && setCarregando(false))
    return () => { cancelado = true }
  }, [])

  const fotoSrc = useAuthSrc(perfil?.foto_url || null)

  if (carregando) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[var(--sf-bg)]">
        {errorModal.element}
        <Spinner />
      </div>
    )
  }

  if (!perfil) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6 bg-[var(--sf-bg)]">
        {errorModal.element}
      </div>
    )
  }

  const altura = perfil.height ? `${perfil.height} m` : null
  const peso = perfil.weight ? `${perfil.weight} kg` : null
  const idade = perfil.age ? `${perfil.age} anos` : null

  return (
    <div className="pb-8 bg-[var(--sf-bg)] min-h-full">
      {errorModal.element}

      <div className="px-4 pt-4 pb-3 border-b border-[var(--sf-border)] bg-[var(--sf-bg)]/95 backdrop-blur-sm sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => navigate('/aluno')}
          title="Voltar"
          className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-white border border-[var(--sf-border)] hover:border-[var(--sf-border-strong)] rounded-lg transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-white text-base font-bold flex-1">Meu Perfil</h1>
      </div>

      <div className="px-3 pt-4 space-y-3">
        <GlassCard as="div" className="px-4 py-5 flex flex-col items-center text-center">
          <div className="relative">
            <div className="absolute -inset-2 rounded-full bg-[#2563EB]/30 blur-xl" aria-hidden="true" />
            {fotoSrc ? (
              <img
                src={fotoSrc}
                alt={perfil.nome_completo}
                className="relative w-24 h-24 rounded-full object-cover ring-2 ring-[#60A5FA] shadow-[0_0_24px_rgba(37,99,235,0.45)]"
              />
            ) : (
              <div className="relative w-24 h-24 rounded-full bg-[var(--sf-bg)] flex items-center justify-center text-white font-bold text-xl ring-2 ring-[#60A5FA] shadow-[0_0_24px_rgba(37,99,235,0.45)]">
                {iniciais(perfil.nome_completo)}
              </div>
            )}
          </div>
          <h2 className="text-white text-lg font-bold mt-3">{perfil.nome_completo || '—'}</h2>
          {perfil.email && (
            <p className="text-[var(--sf-text-muted)] text-xs mt-1 flex items-center gap-1.5">
              <Mail size={11} />
              {perfil.email}
            </p>
          )}
        </GlassCard>

        <ActionButton variant="ghost" fullWidth icon={Pencil} onClick={() => navigate('/aluno/perfil/editar')}>
          Editar Perfil
        </ActionButton>

        <SectionHeader icon={<User size={15} />} label="Dados pessoais" />
        <GlassCard as="div" className="overflow-hidden">
          <div className="divide-y divide-[var(--sf-border)]">
            <InfoRow icon={<Phone size={14} />} label="Telefone" value={perfil.telefone} />
            <InfoRow icon={<IdCard size={14} />} label="CPF" value={perfil.cpf} />
            <InfoRow icon={<User size={14} />} label="Sexo" value={perfil.sexo} />
            <InfoRow icon={<Calendar size={14} />} label="Data de nascimento" value={fmtDataBR(perfil.data_nascimento)} />
            <InfoRow icon={<Calendar size={14} />} label="Idade" value={idade} />
            <InfoRow icon={<Briefcase size={14} />} label="Profissão" value={perfil['profissão']} />
            <InfoRow icon={<MapPin size={14} />} label="Endereço" value={perfil['endereço']} />
            {perfil.instagram && (
              <div className="flex items-start gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg border border-[var(--sf-border)] bg-[var(--sf-bg)] flex items-center justify-center text-[#60A5FA] shrink-0">
                  <AtSign size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[#60A5FA] text-[10px] font-bold uppercase"
                    style={{ letterSpacing: '0.18em' }}
                  >
                    Instagram
                  </p>
                  <a
                    href={`https://instagram.com/${perfil.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#60A5FA] text-sm font-semibold mt-0.5 hover:underline break-words inline-block"
                  >
                    @{perfil.instagram}
                  </a>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        <SectionHeader icon={<Activity size={15} />} label="Composição & treino" />
        <GlassCard as="div" className="overflow-hidden">
          <div className="divide-y divide-[var(--sf-border)]">
            <InfoRow icon={<Ruler size={14} />} label="Altura" value={altura} />
            <InfoRow icon={<Scale size={14} />} label="Peso" value={peso} />
            <InfoRow icon={<Activity size={14} />} label="Frequência de atividade" value={perfil.frequencia_atividade} />
            <InfoRow icon={<Target size={14} />} label="Objetivo" value={perfil.objetivo} />
          </div>
        </GlassCard>

        {(perfil.doencas || perfil.medicamento) && (
          <>
            <SectionHeader icon={<Heart size={15} />} label="Saúde" />
            <GlassCard as="div" className="overflow-hidden">
              <div className="divide-y divide-[var(--sf-border)]">
                <InfoRow icon={<Heart size={14} />} label="Doenças" value={perfil.doencas} />
                <InfoRow icon={<Pill size={14} />} label="Medicamentos" value={perfil.medicamento} />
              </div>
            </GlassCard>
          </>
        )}

        <SectionHeader icon={<User size={15} />} label="Vínculo & acessos" />
        <GlassCard as="div" className="overflow-hidden">
          <div className="divide-y divide-[var(--sf-border)]">
            <InfoRow icon={<User size={14} />} label="Profissional vinculado" value={perfil.profissional_nome} />
            <AcessoRow icon={<Dumbbell size={14} />} label="Acesso ao módulo de treino" ativo={!!perfil.treino} />
            <AcessoRow icon={<Apple size={14} />} label="Acesso ao módulo de dieta" ativo={!!perfil.dieta} />
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
