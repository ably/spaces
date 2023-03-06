/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: 'jit',
  content: ['./app/index.html', './app/**/*.{html,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'ably-black': '#03020D',
        'ably-charcoal-grey': '#292831',
      },
    },
  },
  plugins: [],
};
