export const ALLOWED_COLORS = [
  'slate', 'red', 'rose', 'orange', 'amber', 'yellow',
  'lime', 'green', 'emerald', 'teal', 'cyan', 'sky',
  'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink',
]

export const COLOR_DOT = {
  slate: 'bg-slate-400', red: 'bg-red-400', rose: 'bg-rose-400',
  orange: 'bg-orange-400', amber: 'bg-amber-400', yellow: 'bg-yellow-400',
  lime: 'bg-lime-400', green: 'bg-green-400', emerald: 'bg-emerald-400',
  teal: 'bg-teal-400', cyan: 'bg-cyan-400', sky: 'bg-sky-400',
  blue: 'bg-blue-400', indigo: 'bg-indigo-400', violet: 'bg-violet-400',
  purple: 'bg-purple-400', fuchsia: 'bg-fuchsia-400', pink: 'bg-pink-400',
}

export const COLOR_BADGE = {
  slate:    'bg-slate-500/10 text-slate-300 border-slate-500/30',
  red:      'bg-red-500/10 text-red-300 border-red-500/30',
  rose:     'bg-rose-500/10 text-rose-300 border-rose-500/30',
  orange:   'bg-orange-500/10 text-orange-300 border-orange-500/30',
  amber:    'bg-amber-500/10 text-amber-300 border-amber-500/30',
  yellow:   'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
  lime:     'bg-lime-500/10 text-lime-300 border-lime-500/30',
  green:    'bg-green-500/10 text-green-300 border-green-500/30',
  emerald:  'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  teal:     'bg-teal-500/10 text-teal-300 border-teal-500/30',
  cyan:     'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  sky:      'bg-sky-500/10 text-sky-300 border-sky-500/30',
  blue:     'bg-blue-500/10 text-blue-300 border-blue-500/30',
  indigo:   'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
  violet:   'bg-violet-500/10 text-violet-300 border-violet-500/30',
  purple:   'bg-purple-500/10 text-purple-300 border-purple-500/30',
  fuchsia:  'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30',
  pink:     'bg-pink-500/10 text-pink-300 border-pink-500/30',
}

export const HEX_COLORS = {
  slate: '#94a3b8', red: '#f87171', rose: '#fb7185',
  orange: '#fb923c', amber: '#fbbf24', yellow: '#facc15',
  lime: '#a3e635', green: '#4ade80', emerald: '#34d399',
  teal: '#2dd4bf', cyan: '#22d3ee', sky: '#38bdf8',
  blue: '#60a5fa', indigo: '#818cf8', violet: '#a78bfa',
  purple: '#c084fc', fuchsia: '#e879f9', pink: '#f472b6',
}

export const STATUS_BADGE = {
  Pausado: {
    label: 'Pausado',
    className: 'bg-black text-white border-gray-600',
  },
  Pago_e_nao_iniciado: {
    label: 'Pago e não iniciado',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  Renova_esse_mes: {
    label: 'Renova esse mês',
    className: 'bg-orange-100 text-orange-800 border-orange-300',
  },
  Renova: {
    label: 'Renova',
    className: 'bg-orange-100 text-orange-800 border-orange-300',
  },
  Vencido: {
    label: 'Vencido',
    className: 'bg-[#850000] text-white border-red-900',
  },
  Inativo: {
    label: 'Inativo',
    className: 'bg-red-600 text-white border-red-700',
  },
  Nao_renovou: {
    label: 'Inativo',
    className: 'bg-red-600 text-white border-red-700',
  },
  Ativo: {
    label: 'Ativo',
    className: 'bg-green-100 text-green-800 border-green-300',
  },
  Sem_plano: {
    label: 'Pendente',
    className: 'bg-gray-100 text-gray-500 border-transparent',
  },
  Pendente: {
    label: 'Pendente',
    className: 'bg-gray-100 text-gray-500 border-transparent',
  },
}

export const MES_BADGE = [
  { name: 'JAN', className: 'bg-orange-500/10 text-orange-300 border-orange-500/30' },
  { name: 'FEV', className: 'bg-pink-500/10 text-pink-300 border-pink-500/30' },
  { name: 'MAR', className: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30' },
  { name: 'ABR', className: 'bg-purple-500/10 text-purple-300 border-purple-500/30' },
  { name: 'MAI', className: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' },
  { name: 'JUN', className: 'bg-blue-500/10 text-blue-300 border-blue-500/30' },
  { name: 'JUL', className: 'bg-sky-500/10 text-sky-300 border-sky-500/30' },
  { name: 'AGO', className: 'bg-teal-500/10 text-teal-300 border-teal-500/30' },
  { name: 'SET', className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  { name: 'OUT', className: 'bg-lime-500/10 text-lime-300 border-lime-500/30' },
  { name: 'NOV', className: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30' },
  { name: 'DEZ', className: 'bg-slate-500/10 text-slate-300 border-slate-500/30' },
]

export const METODOS_PAGAMENTO = ['Pix', 'Cartao', 'Boleto']

export const MODALIDADES = ['A vista', 'Parcelado']

export const MODALIDADE_HINT = {
  'A vista': 'Cobrança única no momento da venda (mesmo se a aluna parcelou no cartão dela).',
  'Parcelado': 'N cobranças mensais separadas. Cada parcela tem vencimento próprio.',
}

export const ACOES_AUDITORIA = [
  'CRIOU_CONTRATO',
  'EDITOU_CONTRATO',
  'EXCLUIU_CONTRATO',
  'DEU_BAIXA_PARCELA',
  'REMOVEU_BAIXA_PARCELA',
  'RENOVOU_CONTRATO',
  'CRIOU_PLANO',
  'EDITOU_PLANO',
  'EXCLUIU_PLANO',
]
