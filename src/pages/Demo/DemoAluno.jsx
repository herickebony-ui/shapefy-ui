// Demo navegavel da area do aluno pra embedar via iframe na landing page.
// Rota publica /demo/aluno — sem auth, sem API, dados mockados.
//
// Funciona como uma SPA dentro do iframe: o usuario pode CLICAR nos modulos,
// nas fichas, em "Iniciar treino", etc., e navegar de verdade pelas telas.
// Tem um auto-tour scripted que simula o profissional clicando.
//
// Telas: home → treinos → ficha → execucao + home → dieta
// Pilha de navegacao real (botao voltar funciona).

import { useEffect, useRef, useState } from 'react'
import {
  Dumbbell, Apple, Scale, MessageSquare,
  Bell, Calendar, ChevronRight, Pill, User,
  ArrowLeft, BarChart3, Info, Leaf, Play, Check,
  FileText, Timer, Repeat, Activity, X, ClipboardList, Ban,
} from 'lucide-react'

// Historico generico usado nos cards de execucao da demo
const HISTORICO_DEMO = [
  { rotulo: 'Serie 1', historico: '12 reps - 40kg', check: true },
  { rotulo: 'Serie 2', historico: '10 reps - 55kg', check: true },
  { rotulo: 'Serie 3', historico: '8 reps - 40kg',  check: true },
]
import {
  GlassCard, ModuleCard, DataChip, SectionHeader,
} from '../../components/aluno'

const InstagramIcon = (props) => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
)

// ─── MOCK DATA ───────────────────────────────────────────────────────────────

const PROFISSIONAL = {
  nome: 'Dr. Carlos Andrade',
  iniciais: 'CA',
  area_atuacao: 'Nutricionista esportivo · CRN 8 12345',
  instagram: 'dr.carlos.fit',
}

const MODULOS = [
  { id: 'treino', icon: Dumbbell, label: 'Treino', destino: 'treinos' },
  { id: 'dieta', icon: Apple, label: 'Dieta', destino: 'dieta' },
  { id: 'prescricoes', icon: Pill, label: 'Prescrições' },
  { id: 'avaliacoes', icon: Scale, label: 'Avaliações' },
  { id: 'feedback', icon: MessageSquare, label: 'Feedback', muted: true },
  { id: 'perfil', icon: User, label: 'Meu Perfil' },
]

const PROX_FEEDBACK = {
  data: '2026-06-08',
  titulo: 'Feedback — Plano Premium',
  data_fmt: '08/06/2026',
  total: 5,
}

const FICHAS = [
  { name: 'F1', titulo: 'Hipertrofia · Intermediário', inicio: '17/05/2026', fim: '11/07/2026', nivel: 'Intermediário', dias_info: '46 dias restantes' },
]

const FICHA_DETAIL = {
  ciclo: 'Mesociclo',
  periodo: '24 de maio de 2026 até 6 de junho de 2026',
  dias: [
    { dia: 'Segunda', treino: 'Full Lower' },
    { dia: 'Terça',   treino: 'Full Lower', ativo: true },
    { dia: 'Quarta',  treino: 'Push' },
    { dia: 'Quinta',  treino: 'Full Lower' },
    { dia: 'Sexta',   treino: 'Ombro e braço' },
    { dia: 'Sábado',  treino: 'Off' },
    { dia: 'Domingo', treino: 'Off' },
  ],
  treinos: [
    { letra: 'A', tipo: 'Pull' },
    { letra: 'B', tipo: 'Push' },
    { letra: 'C', tipo: 'Full Lower' },
    { letra: 'D', tipo: 'Full Body' },
  ],
}

// Workout completo (Pull) — dados reais do profissional
const ALONGAMENTOS_PULL = [
  { id: 'a1', nome: 'ALONGAMENTO DE PEITORAL BILATERAL NO ESPALDAR', series: 3, cor: 'amber', youtubeId: 'SpwHUdm2Js0' },
  { id: 'a2', nome: 'ALONGAMENTO PIGEON NO SOLO',                    series: 3, cor: 'amber', youtubeId: '_n6_3vYrSQ4' },
]

// Treino com suporte a tecnicas combinadas (bi-set, super-set, tri-set).
// Cada item tem tipo='simples' (exercicio unico) ou tipo='biset' (multiplos
// encadeados sem descanso entre eles).
const TREINO_PULL = [
  {
    tipo: 'simples', id: 1,
    grupo: 'Costas',
    nome: 'Remada cavalinho na máquina pegada neutra',
    series: 3, reps: '15',
    descanso: '00:45 a 01:20',
    tipoSerie: 'Aquecimento, Preparatória, Trabalho',
    obs: 'Pico de contração de 1s a cada rep.',
    youtubeId: 'oawSlY4LIHU',
    cor: 'rose',
  },
  {
    tipo: 'biset', id: 'bi-1', label: 'Superset',
    exercicios: [
      { letra: 'a', grupo: 'Costas', nome: 'Puxada alta articulada (high row)',  series: 3, reps: '15', descanso: '00:45 a 01:20', youtubeId: '2rqDtzv1O-w', cor: 'rose' },
      { letra: 'b', grupo: 'Costas', nome: 'Remada articulada pegada neutra',    series: 3, reps: '15', descanso: '00:45 a 01:20', youtubeId: 'f14fP5BUEow', cor: 'rose' },
      { letra: 'c', grupo: 'Costas', nome: 'Puxada frente com triângulo',        series: 3, reps: '50', descanso: '00:10',         youtubeId: 'VtzH-U_esOQ', cor: 'rose' },
    ],
  },
  {
    tipo: 'simples', id: 3,
    grupo: 'Costas',
    nome: 'Pull Around',
    series: 3, reps: '15',
    descanso: '00:45 a 01:20',
    youtubeId: 'Y9dxwS3lX5w',
    cor: 'rose',
  },
  {
    tipo: 'simples', id: 4,
    grupo: 'Bíceps',
    nome: 'Rosca bíceps c/ halter no banco inclinado a 70°',
    series: 4, reps: '20',
    descanso: '01:00',
    youtubeId: '-ZmsE2cpiHQ',
    cor: 'violet',
  },
  {
    tipo: 'simples', id: 5,
    grupo: 'Bíceps',
    nome: 'Rosca simultânea na polia',
    series: 4, reps: '15',
    descanso: '00:45 a 01:20',
    obs: 'Pico de contração de 1s.',
    youtubeId: '3dfo_syLFaI',
    cor: 'violet',
  },
]

const GRUPO_COR = {
  rose:     { txt: 'text-rose-300',    border: 'border-rose-400/40',    bg: 'bg-rose-500/10',    grad: 'from-rose-900/40 to-rose-700/10' },
  emerald:  { txt: 'text-emerald-300', border: 'border-emerald-400/40', bg: 'bg-emerald-500/10', grad: 'from-emerald-900/40 to-emerald-700/10' },
  violet:   { txt: 'text-violet-300',  border: 'border-violet-400/40',  bg: 'bg-violet-500/10',  grad: 'from-violet-900/40 to-violet-700/10' },
  amber:    { txt: 'text-amber-300',   border: 'border-amber-400/40',   bg: 'bg-amber-500/10',   grad: 'from-amber-900/40 to-amber-700/10' },
}

const CRONOMETRO = '00:00:18'

const NOTIFICACOES = [
  { id: 1, tipo: 'anamnese', titulo: 'Nova anamnese, João!',                 desc: 'Acesse o app para preencher: Test',          quando: '1d',    abrir: false },
  { id: 2, tipo: 'treino',   titulo: 'Seu novo treino está disponível!',     desc: 'Confira sua nova ficha de treino no app.',   quando: '1d',    abrir: true },
  { id: 3, tipo: 'treino',   titulo: 'Seu novo treino está disponível!',     desc: 'Confira sua nova ficha de treino no app.',   quando: '1d',    abrir: true },
  { id: 4, tipo: 'anamnese', titulo: 'Nova anamnese, João!',                 desc: 'Acesse o app para preencher: Test',          quando: '1d',    abrir: false },
  { id: 5, tipo: 'anamnese', titulo: 'Nova anamnese, João!',                 desc: 'Acesse o app para preencher: Test',          quando: '1d',    abrir: false },
  { id: 6, tipo: 'anamnese', titulo: 'Nova anamnese, João!',                 desc: 'Acesse o app para preencher: Test',          quando: '1d',    abrir: false },
  { id: 7, tipo: 'treino',   titulo: 'Retorno do Profissional - Treino A',   desc: 'Excelente João!',                            quando: '19/05', abrir: false },
]

const NOTIF_ICONS = {
  anamnese: { Icon: ClipboardList, cor: 'text-purple-300', bg: 'bg-purple-500/15', border: 'border-purple-400/30' },
  treino:   { Icon: Dumbbell,      cor: 'text-orange-300', bg: 'bg-orange-500/15', border: 'border-orange-400/30' },
}

const AEROBICOS_SEMANA = [
  {
    id: 1,
    nome: 'CARDIO CONTÍNUO - LISS',
    frequencia: '3x na semana',
    instrucao: '20 min em dias de inferiores | 40 min em dias de superiores | 60 min em dias de descanso',
    feitas: 0,
    total: 3,
    cor: 'rose',
    youtubeId: 'Ot63XXMON70',
  },
  {
    id: 2,
    nome: 'HIIT',
    frequencia: '3x na semana',
    instrucao: '10 tiros de 1min - descanso ativo de 1min',
    feitas: 0,
    total: 3,
    cor: 'amber',
    youtubeId: 'bz5w9k9lyH0',
  },
]

const OBSERVACOES = `Consumo de água diário: 2,0 a 3,0 litros. Ao acordar, beba 300ml.

Refeição livre: substitua o jantar ou almoço 1x no final de semana e faça a refeição livre conforme o manual nas orientações iniciais.`

const ORIENTACOES_GERAIS = `• Vegetais: Pepino, chuchu, abobrinha, alface, acelga, broto de bambu, beringela, rúcula, couve manteiga.
• Crucíferos: Brócolis, couve, couve flor, couve de bruxelas, repolho.
• Legumes: Abóbora, beterraba, cenoura, ervilha, quiabo, tomate, nabo e vagem.

Escolha ao menos 1 opção de cada alimento!`

const REFEICOES = [
  {
    titulo: '1ª Refeição',
    opcao: 'Opção 1',
    itens: [
      { food: 'Arroz branco/parboilizado/integral cozido', qtd: '100g' },
      { food: 'Cuscuz de milho cozido', qtd: '50g', sub: 'ou Macarrão cozido: 80g' },
      { food: 'Peito de frango grelhado', qtd: '150g' },
      { food: 'Salada verde à vontade' },
    ],
  },
  {
    titulo: '2ª Refeição',
    opcao: 'Opção 1',
    itens: [
      { food: 'Ovos mexidos', qtd: '3 unidades' },
      { food: 'Pão integral', qtd: '2 fatias' },
      { food: 'Banana prata', qtd: '1 unidade' },
    ],
  },
]

// ─── COMPONENTES REUTILIZAVEIS ───────────────────────────────────────────────

// Thumbnail de video — usa hqdefault.jpg do YouTube quando ha youtubeId,
// senao mostra um gradient colorido pela cor do grupo muscular.
function VideoThumb({ size = 'md', cor = 'rose', duracao, large = false, youtubeId }) {
  const g = GRUPO_COR[cor] || GRUPO_COR.rose
  const SIZES = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-full aspect-video',
  }
  const thumbUrl = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${g.border} bg-gradient-to-br ${g.grad} shrink-0 ${SIZES[size]}`}
      style={thumbUrl ? { backgroundImage: `url(${thumbUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      {!thumbUrl && (
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.12), transparent 60%), radial-gradient(circle at 70% 80%, rgba(96,165,250,0.18), transparent 50%)'
        }} />
      )}
      {thumbUrl && <div className="absolute inset-0 bg-black/35" />}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`${large ? 'h-12 w-12' : 'h-7 w-7'} rounded-full bg-[#2563EB]/95 flex items-center justify-center text-white shadow-[0_0_16px_rgba(37,99,235,0.5)]`}>
          <Play size={large ? 18 : 10} fill="currentColor" />
        </div>
      </div>
      {duracao && (
        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[8px] font-bold tabular-nums">
          {duracao}
        </div>
      )}
    </div>
  )
}

// Painel de notificacoes — overlay sobre a tela atual
function PanelNotificacoes({ onClose }) {
  return (
    <div className="absolute inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Painel deslizante a partir do topo */}
      <div className="absolute left-3 right-3 top-3 bottom-3 flex flex-col bg-[var(--sf-bg)] border border-[var(--sf-border-strong)] rounded-2xl shadow-[0_0_40px_rgba(37,99,235,0.25)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--sf-border)] flex items-center justify-between bg-gradient-to-r from-[var(--sf-bg)] to-[var(--sf-surface-2)]">
          <div>
            <h3 className="text-white text-base font-bold">Notificações</h3>
            <p className="text-[var(--sf-text-soft)] text-xs mt-0.5">Nenhuma nova</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-white border border-[var(--sf-border)] hover:border-[var(--sf-border-strong)] rounded-lg transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {NOTIFICACOES.map((n) => {
            const conf = NOTIF_ICONS[n.tipo]
            return (
              <div
                key={n.id}
                className={`relative px-3 py-2.5 rounded-xl border bg-[var(--sf-surface)] ${conf.border}`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-8 h-8 rounded-lg border border-[var(--sf-border)] flex items-center justify-center shrink-0 ${conf.bg} ${conf.cor}`}>
                    <conf.Icon size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-bold leading-snug">{n.titulo}</p>
                    <p className="text-[var(--sf-text-muted)] text-[11px] leading-relaxed mt-0.5">{n.desc}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[#60A5FA] text-[10px] font-medium">{n.quando}</span>
                      {n.abrir && (
                        <button className="text-[#60A5FA] text-[11px] font-bold flex items-center gap-0.5 hover:underline">
                          Abrir <ChevronRight size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── CABECALHOS REUTILIZAVEIS ────────────────────────────────────────────────

function HeaderInterno({ titulo, subtitulo, onBack }) {
  return (
    <div className="px-4 pt-4 pb-3 border-b border-[var(--sf-border)] bg-[var(--sf-bg)]/95 backdrop-blur-sm sticky top-0 z-10 flex items-center gap-3">
      <button
        onClick={onBack}
        title="Voltar"
        className="h-9 w-9 flex items-center justify-center text-gray-300 hover:text-white border border-[var(--sf-border)] hover:border-[var(--sf-border-strong)] rounded-lg transition-colors shrink-0"
      >
        <ArrowLeft size={16} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-white text-base font-bold truncate">{titulo}</p>
        {subtitulo && <p className="text-[var(--sf-text-muted)] text-[11px] truncate">{subtitulo}</p>}
      </div>
    </div>
  )
}

// ─── CENAS ───────────────────────────────────────────────────────────────────

function CenaHome({ onNav, onAbrirNotif }) {
  return (
    <div className="pb-8 bg-[var(--sf-bg)] min-h-full">
      {/* Banner profissional — capa personalizada simulando white-label */}
      <div className="relative">
        <div
          className="h-44 w-full relative overflow-hidden"
          style={{
            background: `
              radial-gradient(ellipse at 30% 30%, rgba(37,99,235,0.5) 0%, transparent 55%),
              radial-gradient(ellipse at 70% 70%, rgba(14,165,233,0.35) 0%, transparent 50%),
              linear-gradient(135deg, #0a1530 0%, #050918 60%, #0a1530 100%)
            `,
          }}
        >
          {/* Padrão diagonal sutil (estilo "brand") */}
          <div className="absolute inset-0 opacity-25" style={{
            backgroundImage: `repeating-linear-gradient(115deg, rgba(96,165,250,0.08) 0px, rgba(96,165,250,0.08) 1px, transparent 1px, transparent 14px)`
          }} />

          {/* Brand name estilizado — palavra grande em italico */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4">
            <p style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontStyle: 'italic',
              fontWeight: 700,
              fontSize: '2.6rem',
              lineHeight: 0.9,
              letterSpacing: '-0.045em',
              color: '#fff',
              textShadow: '0 4px 24px rgba(0,0,0,0.6), 0 0 40px rgba(37,99,235,0.35)',
              transform: 'translateY(-4px)',
            }}>
              Dr. Carlos
            </p>
            <p style={{
              fontSize: '0.62rem',
              fontWeight: 800,
              color: '#93c5fd',
              letterSpacing: '0.42em',
              textTransform: 'uppercase',
              marginTop: '0.45rem',
              textShadow: '0 0 12px rgba(37,99,235,0.6)',
            }}>
              Performance · Hipertrofia
            </p>
          </div>

          {/* Pinceladas / glow decorativos */}
          <div className="absolute -top-8 -left-6 w-32 h-32 rounded-full pointer-events-none" style={{
            background: 'radial-gradient(circle, rgba(96,165,250,0.18) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }} />
          <div className="absolute -bottom-10 -right-8 w-40 h-40 rounded-full pointer-events-none" style={{
            background: 'radial-gradient(circle, rgba(14,165,233,0.22) 0%, transparent 70%)',
            filter: 'blur(28px)',
          }} />

          <span className="absolute top-3 left-4 z-10 text-white/85 text-[10px] font-bold uppercase tracking-widest drop-shadow">
            Seu profissional
          </span>
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-[var(--sf-bg)]" />
        </div>

        <div className="px-4 -mt-16 pb-4 flex flex-col items-center text-center relative">
          <div className="relative">
            <div className="absolute -inset-3 rounded-full bg-[#2563EB]/40 blur-2xl" />
            <div className="absolute -inset-1 rounded-full bg-[#60A5FA]/30 blur-lg" />
            <div className="relative w-24 h-24 rounded-full bg-[var(--sf-bg)] flex items-center justify-center text-white font-bold text-xl ring-2 ring-[#60A5FA] shadow-[0_0_30px_rgba(37,99,235,0.6)]">
              {PROFISSIONAL.iniciais}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <h2 className="text-white text-lg font-bold">{PROFISSIONAL.nome}</h2>
            <button
              onClick={onAbrirNotif}
              title="Notificações"
              className="relative h-9 w-9 flex items-center justify-center rounded-xl border border-[var(--sf-border-strong)] text-[#60A5FA] hover:bg-[#2563EB]/15 hover:border-[#60A5FA] transition-colors shadow-[0_0_12px_rgba(37,99,235,0.25)]"
            >
              <Bell size={14} />
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-[var(--sf-red)] text-white text-[9px] font-bold flex items-center justify-center">2</span>
            </button>
          </div>

          <p className="text-[var(--sf-text-muted)] text-xs mt-1">{PROFISSIONAL.area_atuacao}</p>
          <div className="mt-2 flex items-center gap-1.5 text-gray-300 text-xs">
            <InstagramIcon />
            <span>@{PROFISSIONAL.instagram}</span>
          </div>
        </div>
      </div>

      <section className="px-4 mt-1">
        <div className="grid grid-cols-2 gap-2">
          {MODULOS.map(({ id, icon: Icon, label, muted, destino }) => (
            <ModuleCard
              key={id}
              icon={<Icon size={16} strokeWidth={1.6} />}
              label={label}
              onClick={() => destino && onNav(destino)}
              disabled={muted || !destino}
              hint={muted ? 'Sem feedback agendado no momento' : (!destino ? 'Toque pra ver' : undefined)}
            />
          ))}
        </div>
      </section>

      <section className="px-4 mt-5">
        <div className="flex items-center justify-between mb-2">
          <SectionHeader icon={<Calendar size={15} />} label="Próximo feedback" />
          <button className="flex items-center gap-1 text-[#60A5FA] text-xs font-bold -mt-1">
            Ver todos ({PROX_FEEDBACK.total})
            <ChevronRight size={13} />
          </button>
        </div>
        <GlassCard as="div" className="px-3 py-2.5 flex items-center gap-3">
          <DataChip data={PROX_FEEDBACK.data} size="sm" tone="soon" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-bold truncate">{PROX_FEEDBACK.titulo}</p>
            <p className="text-[var(--sf-text-soft)] text-[10px] mt-0.5">{PROX_FEEDBACK.data_fmt}</p>
          </div>
        </GlassCard>
      </section>
    </div>
  )
}

function CenaTreinos({ onNav, onBack }) {
  return (
    <div className="pb-8 bg-[var(--sf-bg)] min-h-full">
      <HeaderInterno titulo="Meus treinos" onBack={onBack} />
      <div className="px-4 pt-4">
        <SectionHeader icon={<Dumbbell size={15} />} label="Minhas fichas" />
        <div className="flex flex-col gap-3 mt-2">
          {FICHAS.map((f) => (
            <GlassCard key={f.name} as="button" onClick={() => onNav('ficha')} className="px-4 py-4 flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl border border-[var(--sf-border-strong)] bg-[var(--sf-surface-2)] flex items-center justify-center text-[#60A5FA] shrink-0 shadow-[0_0_10px_rgba(37,99,235,0.25)]">
                <Dumbbell size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold truncate">{f.titulo}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px]">
                  <span className="flex items-center gap-1 text-[var(--sf-text-muted)]"><Calendar size={11} /> {f.inicio} - {f.fim}</span>
                  <span className="flex items-center gap-1 text-[var(--sf-text-muted)]"><BarChart3 size={11} /> {f.nivel}</span>
                </div>
                <p className="text-[#60A5FA] text-[11px] font-bold mt-2">{f.dias_info}</p>
              </div>
              <ChevronRight size={16} className="text-[var(--sf-text-soft)] shrink-0 mt-1" />
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  )
}

function CenaFicha({ onNav, onBack }) {
  return (
    <div className="pb-8 bg-[var(--sf-bg)] min-h-full">
      <HeaderInterno titulo="Ficha de Treino" onBack={onBack} />
      <div className="px-4 pt-4 space-y-3">
        {/* CICLO + PERIODO */}
        <GlassCard as="div" className="px-4 py-3">
          <p className="text-[#60A5FA] text-[10px] font-bold uppercase" style={{ letterSpacing: '0.18em' }}>Ciclo</p>
          <p className="text-white text-sm mt-1">{FICHA_DETAIL.ciclo}</p>
          <p className="text-[#60A5FA] text-[10px] font-bold uppercase mt-3" style={{ letterSpacing: '0.18em' }}>Período</p>
          <p className="text-white text-sm mt-1">{FICHA_DETAIL.periodo}</p>
        </GlassCard>

        {/* DISTRIBUICAO SEMANAL */}
        <GlassCard as="div" className="px-4 py-3">
          <p className="text-[#60A5FA] text-[10px] font-bold uppercase" style={{ letterSpacing: '0.18em' }}>Distribuição semanal</p>
          <div className="mt-3 space-y-2">
            {FICHA_DETAIL.dias.map((d) => (
              <div
                key={d.dia}
                className={`flex items-center justify-between px-3 py-2 rounded-xl ${
                  d.ativo
                    ? 'border border-[#2563EB]/60 bg-[#2563EB]/10 text-[#60A5FA]'
                    : 'text-gray-300'
                }`}
              >
                <span className="text-sm">{d.dia}</span>
                <span className={`text-sm ${d.ativo ? 'font-bold' : 'font-semibold text-white'}`}>{d.treino}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* AEROBICOS */}
        <GlassCard as="button" onClick={() => onNav('aerobicos')} className="px-4 py-3 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl border border-[var(--sf-border-strong)] bg-[var(--sf-surface-2)] flex items-center justify-center text-[#60A5FA] shrink-0">
            <Repeat size={16} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[#60A5FA] text-[10px] font-bold uppercase" style={{ letterSpacing: '0.18em' }}>Aeróbicos da semana</p>
            <p className="text-white text-sm font-bold mt-1">2 exercícios</p>
          </div>
          <ChevronRight size={16} className="text-[var(--sf-text-soft)] shrink-0" />
        </GlassCard>

        {/* TREINOS DISPONIVEIS */}
        <p className="text-[#60A5FA] text-[10px] font-bold uppercase pt-2" style={{ letterSpacing: '0.18em' }}>Treinos disponíveis</p>
        <div className="space-y-2">
          {FICHA_DETAIL.treinos.map((t) => (
            <GlassCard key={t.letra} as="div" className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-bold">{t.tipo}</p>
                  <p className="text-[var(--sf-text-muted)] text-xs">Treino {t.letra}</p>
                </div>
                <span className="text-green-400 text-[11px] font-bold border border-green-500/30 rounded-lg px-2 py-0.5">0x</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={() => onNav('verTreino')}
                  className="h-9 rounded-lg border border-[var(--sf-border)] hover:border-[#60A5FA] text-[#60A5FA] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  Ver treino
                </button>
                <button
                  onClick={() => onNav('execucao')}
                  className="h-9 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Play size={11} fill="currentColor" /> Iniciar treino
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  )
}

function ExercicioCardListagem({ ex }) {
  return (
    <GlassCard as="div" className="px-4 py-3">
      <p className="text-white text-[13px] font-bold leading-tight">{ex.nome}</p>
      <p className="text-[var(--sf-text-muted)] text-[11px] mt-1">
        {ex.series}x {ex.reps} · desc {ex.descanso}
      </p>
      <button
        type="button"
        className="mt-2.5 w-full h-9 rounded-xl bg-[#0d1d3a] hover:bg-[#16284f] border border-[#2563EB]/30 hover:border-[#60A5FA] text-[#60A5FA] hover:text-white text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors"
      >
        <Play size={11} fill="currentColor" /> Ver execução
      </button>
    </GlassCard>
  )
}

function BiSetCardListagem({ item }) {
  return (
    <GlassCard as="div" variant="success" className="px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2 py-0.5 uppercase tracking-wider">{item.label}</span>
        <span className="text-[10px] text-[var(--sf-text-muted)] font-semibold">Execute em sequência · sem descanso entre eles</span>
      </div>
      <div className="divide-y divide-[var(--sf-border)]">
        {item.exercicios.map((ex) => (
          <div key={ex.letra} className="py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 text-[11px] font-bold w-5 shrink-0">{ex.letra})</span>
              <div className="min-w-0 flex-1">
                <p className="text-white text-[13px] font-bold leading-tight">{ex.nome}</p>
                <p className="text-[var(--sf-text-muted)] text-[11px] mt-0.5">{ex.series}x {ex.reps} · desc {ex.descanso}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-3 w-full h-9 rounded-xl bg-[#0d1d3a] hover:bg-[#16284f] border border-[#2563EB]/30 hover:border-[#60A5FA] text-[#60A5FA] hover:text-white text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors"
      >
        <Play size={11} fill="currentColor" /> Ver execução
      </button>
    </GlassCard>
  )
}

function CenaVerTreino({ onNav, onBack }) {
  return (
    <div className="pb-24 bg-[var(--sf-bg)] min-h-full relative">
      <HeaderInterno titulo="Pull" onBack={onBack} />

      <div className="px-4 pt-4 space-y-3">
        {/* Info card */}
        <div className="rounded-2xl border border-[#2563EB]/30 bg-[#2563EB]/[0.08] px-4 py-3 flex items-start gap-2.5">
          <Info size={14} className="text-[#60A5FA] mt-0.5 shrink-0" />
          <p className="text-[var(--sf-text-muted)] text-[12px] leading-relaxed">
            Esta é uma <span className="text-white font-bold">visualização</span> do treino. Toque em <span className="text-white font-bold">Iniciar treino</span> para começar e registrar sua sessão.
          </p>
        </div>

        {/* ALONGAMENTOS & MOBILIDADE */}
        <p className="text-[#60A5FA] text-[10px] font-bold uppercase pt-2" style={{ letterSpacing: '0.18em' }}>Alongamentos & Mobilidade</p>
        <div className="space-y-2.5">
          {ALONGAMENTOS_PULL.map((ex) => (
            <GlassCard key={ex.id} as="div" className="px-4 py-3">
              <p className="text-white text-[13px] font-bold leading-tight">{ex.nome}</p>
              <p className="text-[var(--sf-text-muted)] text-[11px] mt-1">{ex.series} séries</p>
              <button
                type="button"
                className="mt-2.5 w-full h-9 rounded-xl bg-[#0d1d3a] hover:bg-[#16284f] border border-[#2563EB]/30 hover:border-[#60A5FA] text-[#60A5FA] hover:text-white text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Play size={11} fill="currentColor" /> Ver execução
              </button>
            </GlassCard>
          ))}
        </div>

        {/* TREINO PRINCIPAL */}
        <p className="text-[#60A5FA] text-[10px] font-bold uppercase pt-3" style={{ letterSpacing: '0.18em' }}>Treino Principal</p>
        <div className="space-y-2.5">
          {TREINO_PULL.map((item) => (
            item.tipo === 'biset'
              ? <BiSetCardListagem key={item.id} item={item} />
              : <ExercicioCardListagem key={item.id} ex={item} />
          ))}
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-[var(--sf-bg)] via-[var(--sf-bg)]/95 to-transparent">
        <button
          onClick={() => onNav('execucao')}
          className="w-full h-12 rounded-2xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(37,99,235,0.5)] transition-all"
        >
          <Play size={14} fill="currentColor" /> Iniciar treino
        </button>
      </div>
    </div>
  )
}

function SeriesBlock({ historico }) {
  return (
    <div className="space-y-3">
      {historico.map((s, i) => (
        <div key={i}>
          <div className="flex items-center gap-2">
            <div className="w-[72px] shrink-0">
              <p className="text-white text-[12px] font-bold leading-tight">{s.rotulo}</p>
              {s.tipo && <p className="text-[var(--sf-text-soft)] text-[10px] mt-0.5 leading-tight">{s.tipo}</p>}
            </div>
            <span className="flex-1 h-8 text-[11px] text-[#60A5FA] bg-[#0d1d3a] border border-[#2563EB]/25 rounded-xl flex items-center justify-center">Reps</span>
            <span className="flex-1 h-8 text-[11px] text-[#60A5FA] bg-[#0d1d3a] border border-[#2563EB]/25 rounded-xl flex items-center justify-center">Kg</span>
            <button className="h-8 w-8 flex items-center justify-center bg-[#0d1d3a] border border-[#2563EB]/25 rounded-xl text-[#60A5FA] shrink-0">
              <FileText size={12} />
            </button>
            <button className={`h-8 w-8 flex items-center justify-center rounded-xl shrink-0 ${s.check ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.45)]' : 'border border-[var(--sf-border)] text-[var(--sf-text-soft)]'}`}>
              <Check size={13} strokeWidth={3} />
            </button>
          </div>
          <p className="text-[var(--sf-text-soft)] text-[10px] mt-1 pl-[80px]">histórico: {s.historico}</p>
        </div>
      ))}
    </div>
  )
}

function ExercicioExecCard({ ex, historico, preview = false, duracao, mostrarAcoes = false }) {
  return (
    <GlassCard as="div" className={`overflow-hidden ${preview ? 'opacity-90' : ''}`}>
      <div className="px-4 py-3 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <span className={`text-[9px] font-bold uppercase tracking-wider ${GRUPO_COR[ex.cor].txt}`}>{ex.grupo}</span>
          <p className="text-white text-[13px] font-bold leading-tight mt-0.5">{ex.nome}</p>
          <p className="text-[#60A5FA] text-[11px] mt-1">{ex.series}x {ex.reps} · desc {ex.descanso}</p>
          {ex.obs && <p className="text-[var(--sf-text-muted)] text-[11px] italic mt-1">{ex.obs}</p>}
        </div>
        {mostrarAcoes && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button title="Substituir" className="h-7 w-7 flex items-center justify-center bg-[#0d1d3a] border border-[#2563EB]/25 rounded-lg text-[#60A5FA]">
              <Repeat size={11} />
            </button>
            <button title="Não consegui executar" className="h-7 w-7 flex items-center justify-center bg-rose-500/10 border border-rose-500/40 rounded-lg text-rose-300">
              <Ban size={11} />
            </button>
          </div>
        )}
      </div>
      <VideoThumb size="lg" cor={ex.cor} duracao={duracao} large youtubeId={ex.youtubeId} />
      {!preview && historico && (
        <div className="px-4 py-3 space-y-3">
          <SeriesBlock historico={mergeTipos(historico, ex.tipoSerie)} />
          <div className="border border-[var(--sf-border)] rounded-xl px-3 py-2.5 bg-[var(--sf-surface)]">
            <p className="text-[var(--sf-text-muted)] text-xs">Como foi a execucao?</p>
          </div>
        </div>
      )}
    </GlassCard>
  )
}

// Funde os nomes das series (Aquecimento/Preparatoria/Trabalho) do tipoSerie
// "A, B, C" no historico generico — preserva intactos quando nao ha tipoSerie.
function mergeTipos(historico, tipoSerie) {
  if (!tipoSerie) return historico
  const tipos = tipoSerie.split(',').map(s => s.trim())
  return historico.map((s, i) => ({ ...s, tipo: tipos[i] || s.tipo }))
}

function BiSetExecCard({ item }) {
  const total = item.exercicios.length
  return (
    <div className="relative pl-4">
      {/* Borda vertical verde a esquerda */}
      <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />

      {/* Header com chip + Execute em sequencia */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/40 rounded-lg px-2 py-0.5 uppercase tracking-wider">{item.label}</span>
        <span className="text-[11px] text-[var(--sf-text-muted)] font-semibold">Execute em sequência</span>
      </div>

      {/* Cada exercicio com full layout + contador i/N */}
      <div className="space-y-3">
        {item.exercicios.map((ex, i) => (
          <div key={ex.letra}>
            <p className="text-emerald-300 text-[10px] font-bold mb-1 pl-1">{i + 1}/{total}</p>
            <ExercicioExecCard ex={ex} historico={HISTORICO_DEMO} mostrarAcoes />
          </div>
        ))}
      </div>
    </div>
  )
}

function AlongamentoExecCard({ ex, ativo }) {
  return (
    <GlassCard as="div" className={`overflow-hidden ${ativo ? '' : 'opacity-90'}`}>
      <div className="px-4 py-3">
        <p className="text-white text-[13px] font-bold leading-tight">{ex.nome}</p>
        <p className="text-[var(--sf-text-muted)] text-[11px] mt-1">{ex.series} séries</p>
      </div>
      <VideoThumb size="lg" cor={ex.cor} large youtubeId={ex.youtubeId} />
      {ativo && (
        <div className="px-4 py-3 space-y-3">
          <div className="border border-[var(--sf-border)] rounded-xl px-3 py-2.5 bg-[var(--sf-surface)]">
            <p className="text-[var(--sf-text-muted)] text-xs">Como foi? Observações...</p>
          </div>
          <button className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.35)] transition-colors">
            <Check size={14} strokeWidth={3} /> Concluído
          </button>
        </div>
      )}
    </GlassCard>
  )
}

function CenaExecucao({ onBack }) {
  return (
    <div className="pb-8 bg-[var(--sf-bg)] min-h-full">
      {/* Header sticky */}
      <div className="px-4 pt-4 pb-3 border-b border-[var(--sf-border)] bg-[var(--sf-bg)]/95 backdrop-blur-sm sticky top-0 z-20 flex items-center gap-3">
        <button onClick={onBack} className="h-9 w-9 flex items-center justify-center text-gray-300 hover:text-white border border-[var(--sf-border)] rounded-lg shrink-0">
          <ArrowLeft size={16} />
        </button>
        <p className="text-white text-base font-bold flex-1 text-center">Pull</p>
        <div className="h-9 w-9" />
      </div>

      {/* Cronometro sticky */}
      <div className="sticky top-[57px] z-10 px-4 py-3 bg-[var(--sf-bg)]/95 backdrop-blur-sm border-b border-[var(--sf-border)]">
        <GlassCard as="div" className="px-4 py-2.5 flex items-center gap-3">
          <Timer size={18} className="text-[#60A5FA] shrink-0" />
          <p className="text-white text-xl font-bold tabular-nums">{CRONOMETRO}</p>
          <p className="text-[var(--sf-text-muted)] text-[11px] ml-auto text-right">Pronto para a próxima série</p>
        </GlassCard>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* ALONGAMENTOS & MOBILIDADE */}
        <p className="text-[#60A5FA] text-[10px] font-bold uppercase" style={{ letterSpacing: '0.18em' }}>Alongamentos & Mobilidade</p>
        {ALONGAMENTOS_PULL.map((al, i) => (
          <AlongamentoExecCard key={al.id} ex={al} ativo={i === 0} />
        ))}

        {/* TREINO PRINCIPAL — todos os exercicios com series completas */}
        <p className="text-[#60A5FA] text-[10px] font-bold uppercase pt-2" style={{ letterSpacing: '0.18em' }}>Treino Principal</p>
        {TREINO_PULL.map((item) => {
          if (item.tipo === 'biset') {
            return <BiSetExecCard key={item.id} item={item} />
          }
          return <ExercicioExecCard key={item.id} ex={item} historico={HISTORICO_DEMO} />
        })}
      </div>
    </div>
  )
}

function CenaAerobicos({ onBack }) {
  return (
    <div className="pb-8 bg-[var(--sf-bg)] min-h-full">
      <div className="px-4 pt-4 pb-3 border-b border-[var(--sf-border)] bg-[var(--sf-bg)]/95 backdrop-blur-sm sticky top-0 z-10 flex items-center gap-3">
        <button onClick={onBack} className="h-9 w-9 flex items-center justify-center text-gray-300 hover:text-white border border-[var(--sf-border)] rounded-lg shrink-0">
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-white text-sm font-bold">Aeróbicos da semana</p>
          <p className="text-[var(--sf-text-muted)] text-[10px]">Semana 2026-W22</p>
        </div>
        <div className="h-9 w-9" />
      </div>

      <div className="px-4 pt-4 space-y-3">
        <SectionHeader icon={<Activity size={14} />} label="Meus aeróbicos" />

        {/* Info card */}
        <div className="rounded-2xl border border-[#2563EB]/30 bg-[#2563EB]/[0.08] px-4 py-3 flex items-start gap-2.5">
          <Info size={14} className="text-[#60A5FA] mt-0.5 shrink-0" />
          <div>
            <p className="text-white text-[12px] font-bold leading-snug">
              A cada aerobico que voce fizer, toque em <span className="font-bold">Concluir aerobico</span>.
            </p>
            <p className="text-[var(--sf-text-muted)] text-[11px] mt-0.5">O contador zera toda segunda-feira.</p>
          </div>
        </div>

        {AEROBICOS_SEMANA.map((aero) => {
          const concluido = aero.feitas >= aero.total
          return (
            <GlassCard key={aero.id} as="div" className="overflow-hidden">
              <div className="px-4 py-3 flex items-start justify-between gap-2">
                <p className="text-white text-[13px] font-bold leading-tight">{aero.nome}</p>
                <span className={`text-[9px] font-bold uppercase tracking-wider border rounded-lg px-2 py-0.5 shrink-0 ${
                  concluido
                    ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
                    : 'text-[#60A5FA] border-[#60A5FA]/40 bg-[#60A5FA]/10'
                }`}>
                  {concluido ? 'Concluído' : 'Pendente'}
                </span>
              </div>

              <div className="px-4 pb-3 space-y-2">
                <div>
                  <p className="text-[#60A5FA] text-[10px] font-bold uppercase" style={{ letterSpacing: '0.18em' }}>Frequência</p>
                  <p className="text-white text-[12px] mt-0.5">{aero.frequencia}</p>
                </div>
                <div>
                  <p className="text-[#60A5FA] text-[10px] font-bold uppercase" style={{ letterSpacing: '0.18em' }}>Instrução</p>
                  <p className="text-white text-[12px] mt-0.5 leading-relaxed">{aero.instrucao}</p>
                </div>
              </div>

              {/* Video preview */}
              <div className="px-4">
                <VideoThumb size="lg" cor={aero.cor} large youtubeId={aero.youtubeId} />
              </div>

              {/* Progresso */}
              <div className="px-4 pt-4 pb-2">
                <div className="flex items-end justify-between gap-2 mb-2">
                  <p className="text-white text-2xl font-bold tabular-nums leading-none">
                    {aero.feitas} <span className="text-[var(--sf-text-soft)] text-base">/ {aero.total}</span>
                  </p>
                  <p className="text-[#60A5FA] text-[10px] font-bold uppercase tracking-widest">Sessões esta semana</p>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[var(--sf-surface-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#60A5FA] transition-all"
                    style={{ width: `${(aero.feitas / aero.total) * 100}%` }}
                  />
                </div>
              </div>

              {/* CTA */}
              <div className="px-4 py-3">
                <button
                  type="button"
                  className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.35)] transition-colors"
                >
                  <Check size={14} strokeWidth={3} /> Concluir aerobico
                </button>
              </div>
            </GlassCard>
          )
        })}
      </div>
    </div>
  )
}

function CenaDieta({ onBack }) {
  return (
    <div className="pb-8 bg-[var(--sf-bg)] min-h-full">
      <HeaderInterno titulo="Minha Dieta" subtitulo="Dieta Linear · Todos Os Dias" onBack={onBack} />

      <div className="px-4 pt-4 space-y-3">
        <GlassCard as="div" className="overflow-hidden">
          <div className="border-l-2 border-[#2563EB] px-4 py-3 bg-[#2563EB]/[0.08] flex items-center gap-2">
            <Info size={14} className="text-[#60A5FA]" />
            <p className="text-[#60A5FA] text-xs font-bold uppercase" style={{ letterSpacing: '0.18em' }}>Observações</p>
          </div>
          <p className="px-4 py-3 text-gray-300 text-[12px] leading-relaxed whitespace-pre-line">{OBSERVACOES}</p>
        </GlassCard>

        <GlassCard as="div" className="overflow-hidden">
          <div className="border-l-2 border-[#22C55E] px-4 py-3 bg-[#22C55E]/[0.08] flex items-center gap-2">
            <Leaf size={14} className="text-[#4ADE80]" />
            <p className="text-[#4ADE80] text-xs font-bold uppercase" style={{ letterSpacing: '0.18em' }}>Orientações gerais</p>
          </div>
          <p className="px-4 py-3 text-gray-300 text-[12px] leading-relaxed whitespace-pre-line">{ORIENTACOES_GERAIS}</p>
        </GlassCard>

        <SectionHeader icon={<Apple size={15} />} label="Plano de refeições" />

        {REFEICOES.map((meal, i) => (
          <GlassCard key={i} as="div" className="overflow-hidden">
            <div className="border-l-2 border-[#2563EB] px-4 py-3 bg-[#2563EB]/[0.08]">
              <p className="text-white text-sm font-bold">{meal.titulo}</p>
            </div>
            <div className="px-4 py-3 space-y-3">
              <p className="text-[#38BDF8] text-[11px] font-bold uppercase" style={{ letterSpacing: '0.18em' }}>{meal.opcao}</p>
              <ul className="space-y-2">
                {meal.itens.map((it, j) => (
                  <li key={j} className="text-sm">
                    <div className="flex gap-2 text-white leading-snug">
                      <span className="text-[#60A5FA] shrink-0">•</span>
                      <span className="flex-1">
                        <span className="font-semibold">{it.food}</span>
                        {it.qtd && <span>: {it.qtd}</span>}
                      </span>
                    </div>
                    {it.sub && <p className="pl-5 mt-1 text-[var(--sf-text-muted)] text-xs leading-relaxed">{it.sub}</p>}
                  </li>
                ))}
              </ul>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}

// ─── ROOT COMPONENT ──────────────────────────────────────────────────────────

const TELAS = {
  home:      { Component: CenaHome },
  treinos:   { Component: CenaTreinos },
  ficha:     { Component: CenaFicha },
  verTreino: { Component: CenaVerTreino },
  execucao:  { Component: CenaExecucao },
  aerobicos: { Component: CenaAerobicos },
  dieta:     { Component: CenaDieta },
}

// Cena inicial pode ser definida via ?inicio=execucao (ou qualquer outra tela)
// Util pra embedar o iframe em locais especificos do landing mostrando direto
// a tela desejada (ex: hero com execucao de treino).
function telaInicialDaUrl() {
  if (typeof window === 'undefined') return 'home'
  const params = new URLSearchParams(window.location.search)
  const inicio = params.get('inicio')
  return (inicio && TELAS[inicio]) ? inicio : 'home'
}

export default function DemoAluno() {
  const [historico, setHistorico] = useState(() => [telaInicialDaUrl()])
  const [notifAberto, setNotifAberto] = useState(false)
  const scrollRef = useRef(null)
  const telaAtual = historico[historico.length - 1]

  const onNav  = (tela) => setHistorico((h) => [...h, tela])
  const onBack = () => setHistorico((h) => (h.length > 1 ? h.slice(0, -1) : h))
  const onAbrirNotif = () => setNotifAberto(true)

  // Suporta ?scroll=N pra pre-rolar o conteudo (util pra embedar parte
  // especifica do conteudo em iframes da landing).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const scroll = parseInt(params.get('scroll'), 10) || 0
    if (scroll > 0 && scrollRef.current) {
      scrollRef.current.scrollTop = scroll
    }
  }, [])

  const { Component } = TELAS[telaAtual]

  return (
    <div className="min-h-[100dvh] bg-[var(--sf-bg)] flex flex-col relative overflow-hidden">
      <div ref={scrollRef} key={historico.join('>')} className="flex-1 overflow-y-auto demo-slide-in">
        <Component onNav={onNav} onBack={onBack} onAbrirNotif={onAbrirNotif} />
      </div>

      {notifAberto && <PanelNotificacoes onClose={() => setNotifAberto(false)} />}

      <style>{`
        @keyframes demoSlideIn {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .demo-slide-in { animation: demoSlideIn 0.35s ease-out; }
      `}</style>
    </div>
  )
}
