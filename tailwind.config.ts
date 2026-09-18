import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-plex-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: '#111827',
        'ink-2': '#374151',
        'ink-3': '#4b5563',
        muted: '#6b7280',
        'line-strong': '#d1d5db',
        line: '#e5e7eb',
        'line-hover': '#9ca3af',
        surface: '#ffffff',
        canvas: '#fafafa',
        page: '#f3f4f6',
        status: {
          poraplicar: '#64748b',
          'poraplicar-bg': '#f1f5f9',
          'poraplicar-text': '#475569',
          aplicado: '#2563eb',
          'aplicado-bg': '#eff6ff',
          'aplicado-text': '#1d4ed8',
          entrevista: '#b45309',
          'entrevista-bg': '#fffbeb',
          'entrevista-text': '#92400e',
          oferta: '#047857',
          'oferta-bg': '#ecfdf5',
          'oferta-text': '#065f46',
          rechazado: '#be123c',
          'rechazado-bg': '#fff1f2',
          'rechazado-text': '#9f1239',
        },
      },
      boxShadow: {
        drag: '0 14px 28px rgba(17,24,39,.18)',
      },
      keyframes: {
        shimmer: {
          '0%, 100%': { opacity: '.55' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
