/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        googleBg: '#131314',
        googleCard: '#1e1f20',
        googleBlue: '#a8c7fa',
        googleText: '#e3e3e3',
        googleSecondary: '#c4c7c5'
      }
    },
  },
  plugins: [],
}
