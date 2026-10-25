/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#EDF0F3',
        surface: '#FFFFFF',
        ink: '#16222E',
        muted: '#5B6875',
        line: '#D5DCE3',
        action: { DEFAULT: '#0E6E5C', hover: '#0B5A4B', soft: '#E3F1EE' },
        warn: { DEFAULT: '#9A6412', soft: '#FBF1DE' },
        danger: { DEFAULT: '#B42318', soft: '#FDECEA' },
      },
      fontFamily: {
        sans: ['"Public Sans Variable"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
