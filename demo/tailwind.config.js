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
        'ably-avatar-stack-demo-slide-text': '#32394E',
        'ably-avatar-stack-demo-show-replies': '#3E3E3E',
        'ably-avatar-stack-demo-new-slide': '#848484',
        'ably-avatar-stack-demo-slide-title-highlight': '#116AEB',
      },
      backdropBlur: {
        'ably-xs': '2.5px',
      },
      boxShadow: {
        'ably-paper': '0px 0px 19px rgba(0, 0, 0, 0.08)'
      }
    },
  },
  plugins: [],
};
