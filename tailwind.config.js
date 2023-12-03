module.exports = {
  purge: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    fontSize: {
      'body-2xl': '1.5rem',
      'body-lg': '1rem',
      'body': '.875rem',
    },
    extend: {
      fontSize: {
        '5xs': '.125rem',
        '4xs': '.250rem',
        '3xs': '.375rem',
        '2xs': '.500rem',
        'xs': '.625rem',
        'sm': '.75rem',
        'base': '.875rem',
        'lg': '1rem',
        'xl': '1.125rem',
        '2xl': '1.250rem',
        '3xl': '1.375rem',
        '4xl': '1.5rem',
        '5xl': '1.625rem',
        '6xl': '1.750rem',
        '7xl': '1.875rem',
        '8xl': ['2.0rem', { lineHeight: '2.8rem' }],
        '9xl': ['2.5rem', { lineHeight: '3.6rem' }],
        '10xl': ['3.0rem', { lineHeight: '1' }],
        '11xl': ['3.5rem', { lineHeight: '1' }],
        '12xl': ['4.0rem', { lineHeight: '1' }],
      },
      inset: {
        '1/5': '10%'
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [
    require('daisyui'),
  ],
}
