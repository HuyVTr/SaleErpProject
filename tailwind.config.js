/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", /* Dòng này quét toàn bộ code của bạn */
  ],
  theme: {
    extend: {
      colors: {
        "acc-primary": "#00288E",
        "acc-primary-dim": "#001D66",
        "acc-primary-container": "#E1E8FF",
        "acc-on-primary": "#FFFFFF",
        "acc-on-primary-container": "#0046c3",
        "acc-secondary": "#56606e",
        "acc-secondary-container": "#d9e3f4",
        "acc-on-secondary": "#f7f9ff",
        "acc-surface": "#f8f9fa",
        "acc-surface-bright": "#f8f9fa",
        "acc-surface-dim": "#d1dce0",
        "acc-surface-container-lowest": "#ffffff",
        "acc-surface-container-low": "#f1f4f6",
        "acc-surface-container": "#eaeff1",
        "acc-surface-container-high": "#e2e9ec",
        "acc-surface-container-highest": "#dbe4e7",
        "acc-on-surface": "#2b3437",
        "acc-on-surface-variant": "#586064",
        "acc-outline": "#737c7f",
        "acc-outline-variant": "#abb3b7",
        "acc-error": "#9f403d",
        "acc-error-container": "#fe8983",
        "acc-on-error-container": "#752121",
        "acc-tertiary": "#5e5c78",
        "acc-tertiary-container": "#dad6f7",
        "acc-on-background": "#2b3437",
      },
      fontFamily: {
        manrope: ["Manrope", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      fontSize: {
        'display-lg': ['2.25rem', { lineHeight: '1.2', fontWeight: '800' }],
        'headline-md': ['1.5rem', { lineHeight: '1.3', fontWeight: '700' }],
      }
    },
  },
  plugins: [],
}