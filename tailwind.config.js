/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── Backgrounds ──────────────────────────────
        'td-bg':      '#202024', // Fundo principal da página
        'td-surface': '#29292e', // Cards, modais, sidebars
        'td-deep':    '#1a1a1a', // Inputs, thead de tabelas
        'td-deeper':  '#121212', // Contraste alto

        // ── Bordas ───────────────────────────────────
        'td-border':  '#323238', // Todas as bordas

        // ── Marca ────────────────────────────────────
        'td-primary':       '#850000', // Botões, destaques
        'td-primary-hover': '#b91c1c', // hover:bg-red-700

        // ── Texto ────────────────────────────────────
        // Nível 1: text-white (títulos)
        // Nível 2: text-gray-200 (corpo)
        // Nível 3: text-gray-400 (metadados)
        // Nível 4: text-gray-600 (desabilitado)
      },
      borderRadius: {
        'td': '0.75rem', // rounded-xl padrão do sistema
      },
      boxShadow: {
        // Glows sutis por categoria
        'glow-purple': '0 0 15px rgba(168, 85, 247, 0.05)',
        'glow-green':  '0 0 15px rgba(34, 197, 94, 0.05)',
        'glow-blue':   '0 0 15px rgba(59, 130, 246, 0.05)',
        'glow-red':    '0 0 15px rgba(133, 0, 0, 0.10)',
        'glow-yellow': '0 0 15px rgba(234, 179, 8, 0.05)',
      },
    },
  },
  plugins: [],
}