/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        desk: {
          bg: '#F7F8F3',
          card: '#FFFFFF',
          cardAlt: '#FBFCF8',
          border: '#DCE5D5',
          borderLight: '#E8EFE3',
          primary: '#6FAF7A',
          primaryHover: '#5B9E66',
          tint: '#E6F1DF',
          tintLight: '#F2F7EF',
          tintSelected: '#DDEBD5',
          text: '#1F3A2B',
          textMuted: '#5E7366',
          textSubtle: '#889B8F',
          amber: '#B7791F',
          amberBg: '#FEF7ED',
          amberBorder: '#F5DCB7',
          actual: '#2F6B45',
          forecast: '#C9962B',
          adjusted: '#0D9488',
          grid: '#E3EADD',
        }
      }
    },
  },
  plugins: [],
}
