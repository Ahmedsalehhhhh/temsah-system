/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#F8F9FA',
          900: '#FFFFFF',
          850: '#F9FAFB',
          800: '#F3F4F6',
          700: '#E5E7EB',
          600: '#D1D5DB',
        },
        ink: {
          100: '#1A1A1A',
          300: '#374151',
          500: '#6B7280',
          700: '#6B7280',
        },
        gold: {
          400: '#946B0E',
          500: '#D4A017',
          600: '#B8870E',
        },
        good: '#16A34A',
        bad: '#DC2626',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
