import type { Config } from 'tailwindcss'

/**
 * Auctum Ledger design tokens (docs/design — al-monogram.svg, 02-design-tokens.md §1.1).
 * Documentary-honesty palette: ink field, parchment paper, brass accents.
 * No purple/blue gradients anywhere in the system.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#16323E', // navy-700 — brand static field
          900: '#26201A', // deep ink (body text on paper)
          800: '#1E4250',
          700: '#16323E',
          600: '#2A4A58',
          100: '#D6E0E4',
          50: '#EEF3F4',
        },
        parchment: {
          DEFAULT: '#F6F1E7',
          100: '#F6F1E7',
          200: '#EDE4D3',
        },
        paper: '#FBFAF6',
        brass: {
          DEFAULT: '#C9A34A', // gold-500
          100: '#F5ECD8',
          200: '#EAD9AE',
          500: '#C9A34A',
          600: '#AE8837',
          700: '#8F6F2B',
        },
        green: {
          DEFAULT: '#2F6B4A',
          100: '#E2EEE7',
          500: '#2F6B4A',
          600: '#2F6B4A',
          700: '#26553C',
          800: '#1E4430',
        },
        amber: {
          DEFAULT: '#A8721F',
          100: '#F4E7D2',
          500: '#A8721F',
          600: '#A8721F',
          700: '#8A5C19',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', '"Cormorant Garamond"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        brand: '16%', // AL monogram corner radius
      },
      boxShadow: {
        card: '0 1px 2px rgba(38, 32, 26, 0.06), 0 4px 16px rgba(38, 32, 26, 0.08)',
        drawer: '-8px 0 24px rgba(22, 50, 62, 0.18)',
      },
    },
  },
  plugins: [],
} satisfies Config
