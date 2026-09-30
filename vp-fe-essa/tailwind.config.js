/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Segoe UI',
          'Segoe UI Variable Text',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ]
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }]
      },
      boxShadow: {
        pop: '0 10px 28px rgba(15, 23, 42, 0.12)',
        card: '0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.08)'
      },
      colors: {
        ink: {
          DEFAULT: '#1f2937',
          secondary: '#4b5563',
          muted: '#6b7280',
          faint: '#9ca3af'
        },
        line: {
          DEFAULT: '#e5e7eb',
          soft: '#f3f4f6'
        },
        canvas: '#f8fafb',
        surface: '#ffffff',
        essa: {
          50: '#eef8f0',
          100: '#d8f0dd',
          200: '#b3e0bd',
          500: '#3aaa55',
          600: '#2C9842',
          700: '#247a35',
          800: '#1e6b2e'
        }
      }
    }
  },
  plugins: []
}
