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
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        /* primary accent (indigo). token name kept for stability across components */
        harbor: {
          DEFAULT: 'rgb(var(--harbor) / <alpha-value>)',
          deep: 'rgb(var(--harbor-deep) / <alpha-value>)',
          soft: 'rgb(var(--harbor-soft) / <alpha-value>)',
        },
        amber: 'rgb(var(--amber) / <alpha-value>)',
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
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
          '"Plus Jakarta Sans"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          '"Hiragino Sans"',
          '"Apple SD Gothic Neo"',
          'system-ui',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        soft: '0 1px 3px rgb(30 27 75 / 0.05), 0 12px 32px rgb(30 27 75 / 0.08)',
        lift: '0 4px 14px rgb(30 27 75 / 0.10), 0 28px 64px rgb(30 27 75 / 0.16)',
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
