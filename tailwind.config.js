/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        brand: {
          50: '#FBF5EE',
          100: '#f5ede0',
          200: '#e8d9c0',
          300: '#D4B285',
          400: '#c4a275',
          500: '#1E2D53',
          600: '#152040',
          700: '#0f1830',
          800: '#0a1020',
          900: '#050810',
          950: '#000000',
        }
      }
    },
  },
  plugins: [],
}
