/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#020617', // slate-950
        foreground: '#f1f5f9', // slate-100
        primary: {
          DEFAULT: '#10b981', // emerald-500
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#8b5cf6', // violet-500
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: '#1e293b', // slate-800
          foreground: '#94a3b8', // slate-400
        },
        accent: {
          DEFAULT: '#0ea5e9', // sky-500
          foreground: '#ffffff',
        },
      },
    },
  },
  plugins: [],
}
