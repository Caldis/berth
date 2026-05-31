import animate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'rgb(var(--paper) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        cream: 'rgb(var(--cream) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        /* small color accent (gradient blue); buttons use ink, not this */
        harbor: {
          DEFAULT: 'rgb(var(--harbor) / <alpha-value>)',
          deep: 'rgb(var(--harbor-deep) / <alpha-value>)',
          soft: 'rgb(var(--harbor-soft) / <alpha-value>)',
        },
        amber: 'rgb(var(--amber) / <alpha-value>)',
      },
      fontFamily: {
        sans: [
          'Inter',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          '"Hiragino Sans"',
          '"Yu Gothic"',
          '"Apple SD Gothic Neo"',
          '"Malgun Gothic"',
          'system-ui',
          'sans-serif',
        ],
        display: [
          'Newsreader',
          '"Source Han Serif SC"',
          '"Songti SC"',
          '"Noto Serif SC"',
          '"Hiragino Mincho ProN"',
          'Georgia',
          'serif',
        ],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgb(20 18 14 / 0.03), 0 14px 36px rgb(20 18 14 / 0.07)',
        lift: '0 6px 18px rgb(20 18 14 / 0.08), 0 30px 70px rgb(20 18 14 / 0.12)',
      },
      maxWidth: {
        content: '72rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [animate],
}
