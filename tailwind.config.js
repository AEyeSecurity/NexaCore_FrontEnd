/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        serif: ['Fraunces', 'serif'],
      },
      colors: {
        teal: {
          950: '#04342C',
          900: '#085041',
          800: '#0F6E56',
          700: '#1D9E75',
          400: '#5DCAA5',
          100: '#E1F5EE',
        },
      },
    },
  },
  plugins: [],
}
