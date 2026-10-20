import type { Config } from 'tailwindcss';

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Geist', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"Geist Mono"', '"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        bg: token('bg'),
        panel: token('panel'),
        sunk: token('sunk'),
        fg: token('fg'),
        muted: token('muted'),
        line: token('line'),
        tg: { DEFAULT: token('tg'), ink: token('tg-ink'), deep: token('tg-deep') },
        ok: token('ok'),
        warn: token('warn'),
        bad: token('bad'),
        violet: token('violet'),
      },
      borderRadius: { xl: '14px', '2xl': '18px' },
      boxShadow: {
        card: '0 1px 2px rgb(11 18 32 / 0.05)',
        pop: '0 16px 40px -10px rgb(11 18 32 / 0.28), 0 2px 6px rgb(11 18 32 / 0.06)',
        tg: '0 6px 16px -6px rgb(30 136 214 / 0.8)',
      },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        pulse_ring: { '0%': { boxShadow: '0 0 0 0 rgb(var(--ok) / 0.55)' }, '70%': { boxShadow: '0 0 0 6px rgb(var(--ok) / 0)' }, '100%': { boxShadow: '0 0 0 0 rgb(var(--ok) / 0)' } },
        shimmer: { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
      },
      animation: {
        'fade-up': 'fade-up .35s cubic-bezier(.2,.8,.2,1) both',
        'pulse-ring': 'pulse_ring 1.6s ease-out infinite',
        shimmer: 'shimmer 1.3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
