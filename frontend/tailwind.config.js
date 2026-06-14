/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: 'var(--color-bg)',
          2: 'var(--color-bg-2)',
          3: 'var(--color-bg-3)',
          4: 'var(--color-bg-4)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          hover: 'var(--color-surface-hover)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          2: 'var(--color-border-2)',
          3: 'var(--color-border-3)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          2: 'var(--color-accent-2)',
          soft: 'var(--color-accent-soft)',
          glow: 'var(--color-accent-glow)',
        },
        green: {
          DEFAULT: 'var(--color-green)',
          dim: 'var(--color-green-dim)',
        },
        amber: {
          DEFAULT: 'var(--color-amber)',
          dim: 'var(--color-amber-dim)',
        },
        red: {
          DEFAULT: 'var(--color-red)',
          dim: 'var(--color-red-dim)',
        },
        blue: {
          DEFAULT: 'var(--color-blue)',
          dim: 'var(--color-blue-dim)',
        },
        text: {
          DEFAULT: 'var(--color-text)',
          2: 'var(--color-text-2)',
          3: 'var(--color-text-3)',
        },
        success: 'var(--color-green)',
        warning: 'var(--color-amber)',
        error: 'var(--color-red)',
        info: 'var(--color-blue)',
      },
      fontFamily: {
        head: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
