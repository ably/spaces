/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: 'jit',
  content: ['./app/index.html', './app/**/*.{html,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '375px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      },
      colors: {
        'ably-black': '#03020D',
        'ably-charcoal-grey': '#292831',
        'ably-light-grey': '#F5F5F6',
        'ably-avatar-stack-demo-slide-text': '#32394E',
        'ably-avatar-stack-demo-show-replies': '#3E3E3E',
        'ably-avatar-stack-demo-number-text': '#4E4E4E',
        'ably-avatar-stack-demo-new-slide': '#848484',
        'ably-avatar-stack-demo-slide-title-highlight': '#116AEB',
        'ably-avatar-stack-demo-slide-preview-border': '#D6D1E3',
      },
      backdropBlur: {
        'ably-xs': '2.5px',
      },
      boxShadow: {
        'ably-paper': '0px 0px 19px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  safelist: [
    {
      pattern:
        /(from|to|outline|bg)-(red|orange|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|)-(200|300|400|500|600|700|800)/,
      variants: ['before'],
    },
  ],
  plugins: [],
};
