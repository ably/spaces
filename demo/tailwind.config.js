/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: 'jit',
  content: ['./app/index.html', './app/**/*.{html,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'ably-black': '#03020D',
        'ably-charcoal-grey': '#292831',
        'ably-light-grey': '#F5F5F6',
        'ably-avatar-stack-demo-new-slide': '#848484',
        'ably-avatar-stack-demo-show-replies': '#3E3E3E',
      },
      backdropBlur: {
        'ably-xs': '2.5px',
      }
    },
  },
  plugins: [],
};
