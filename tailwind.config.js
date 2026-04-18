/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#202024',
        surface: '#29292e',
        deep: '#1a1a1a',
        border: '#323238',
        primary: '#850000',
      },
    },
  },
  plugins: [],
}