/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0a0f',
          2: '#111118',
          3: '#16161f',
          4: '#1c1c28',
        },
        border: {
          DEFAULT: '#2a2a3a',
          2: '#353548',
        },
        accent: {
          DEFAULT: '#7c6af7',
          2: '#5b4de0',
          glow: 'rgba(124,106,247,0.15)',
        },
        green: {
          DEFAULT: '#22d3a0',
          dim: 'rgba(34,211,160,0.12)',
        },
        amber: {
          DEFAULT: '#f59e0b',
          dim: 'rgba(245,158,11,0.12)',
        },
        red: {
          DEFAULT: '#f87171',
          dim: 'rgba(248,113,113,0.12)',
        },
        blue: {
          DEFAULT: '#60a5fa',
          dim: 'rgba(96,165,250,0.12)',
        },
        text: {
          DEFAULT: '#e8e8f0',
          2: '#9898b0',
          3: '#5a5a72',
        },
      },
      fontFamily: {
        head: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
