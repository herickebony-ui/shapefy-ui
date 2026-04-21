/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── DS v2 Tokens ────────────────────────────────
        surface: {
          0: '#0a0a0a',  // page bg
          1: '#1a1a1a',  // input bg
          2: '#222226',  // row bg
          3: '#29292e',  // card bg
          4: '#323238',  // hover / border
        },
        brand: {
          DEFAULT: '#2563eb',
          hover:   '#1d4ed8',
        },
        info: {
          DEFAULT: '#0052cc',
          hover:   '#0043a8',
        },
        muscle: {
          quads:    '#c084fc',
          isquios:  '#2dd4bf',
          gmax:     '#fb7185',
          gmed:     '#a78bfa',
          adutor:   '#94a3b8',
          pantur:   '#fb923c',
          costas:   '#f472b6',
          trapezio: '#60a5fa',
          peitoral: '#fbbf24',
          deltant:  '#22d3ee',
          biceps:   '#a3e635',
          triceps:  '#e879f9',
        },
        // ── Legacy tokens (compat) ───────────────────────
        'td-bg':            '#202024',
        'td-surface':       '#29292e',
        'td-deep':          '#1a1a1a',
        'td-deeper':        '#121212',
        'td-border':        '#323238',
        'td-primary':       '#2563eb',
        'td-primary-hover': '#1d4ed8',
      },
      borderRadius: {
        'td': '0.5rem',
      },
      boxShadow: {
        'glow-purple': '0 0 15px rgba(168, 85, 247, 0.05)',
        'glow-green':  '0 0 15px rgba(34, 197, 94, 0.05)',
        'glow-blue':   '0 0 15px rgba(59, 130, 246, 0.05)',
        'glow-brand':   '0 0 15px rgba(37, 99, 235, 0.10)',
        'glow-yellow': '0 0 15px rgba(234, 179, 8, 0.05)',
      },
    },
  },
  plugins: [],
}
