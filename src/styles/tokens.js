// src/styles/tokens.js
// Design System — Titanium Dark
// Use esses tokens em qualquer componente JSX

export const colors = {
  // Backgrounds
  bg:      '#202024',
  surface: '#29292e',
  deep:    '#1a1a1a',
  deeper:  '#121212',

  // Bordas
  border:  '#323238',

  // Marca
  primary:      '#2563eb',
  primaryHover: '#b91c1c',
}

// Classes Tailwind prontas para usar
export const tw = {
  // Páginas
  page:    'bg-[#202024] min-h-screen text-white',

  // Containers
  card:    'bg-[#29292e] border border-[#323238] rounded-xl',
  cardHover: 'bg-[#29292e] border border-[#323238] rounded-xl hover:border-[#2563eb]/40 hover:bg-[#2f2f34] transition-all cursor-pointer',

  // Inputs
  input:   'bg-[#1a1a1a] border border-[#323238] rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-600 outline-none focus:border-[#2563eb]/60 focus:ring-1 focus:ring-[#2563eb]/30 transition-colors',

  // Tabelas
  thead:    'bg-[#1a1a1a] text-white text-xs font-semibold tracking-wider',
  tbody:    'bg-[#29292e] hover:bg-[#323238] transition-colors border-t border-[#323238]',
  tbodyRow: 'bg-[#29292e] hover:bg-[#323238] transition-colors border-t border-[#323238]',

  // Botões
  btnPrimary:   'bg-[#2563eb] hover:bg-red-700 text-white font-semibold rounded-lg transition-colors',
  btnSecondary: 'bg-[#29292e] border border-[#323238] text-gray-400 hover:text-white hover:bg-[#323238] rounded-lg transition-colors',
  btnGhost:     'text-gray-400 hover:text-white hover:bg-[#323238] rounded-lg transition-colors',

  // Texto
  title:    'text-white font-bold',
  body:     'text-gray-200',
  meta:     'text-gray-400',
  disabled: 'text-gray-600',

  // Divisores
  divider:       'border-t border-[#323238]',
  dividerBottom: 'border-b border-[#323238]',

  // Badges por status
  badge: {
    success: 'bg-green-500/10 text-green-400 border border-green-500/30',
    warning: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30',
    danger:  'bg-red-500/10 text-red-400 border border-red-500/30',
    info:    'bg-blue-500/10 text-blue-400 border border-blue-500/30',
    purple:  'bg-purple-500/10 text-purple-400 border border-purple-500/30',
    orange:  'bg-orange-500/10 text-orange-400 border border-orange-500/30',
    default: 'bg-gray-500/10 text-gray-400 border border-gray-500/30',
  },

  // Glows
  glow: {
    purple: 'border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.05)]',
    green:  'border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.05)]',
    blue:   'border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.05)]',
    red:    'border-[#2563eb]/30 shadow-[0_0_15px_rgba(133,0,0,0.10)]',
    yellow: 'border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.05)]',
  }
}