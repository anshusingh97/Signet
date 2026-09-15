/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        graphite: {
          DEFAULT: "#1B1D22",
          deep: "#121317",
          light: "#25282F",
        },
        paper: {
          DEFAULT: "#EDEAE2",
          dim: "#C9C5B9",
        },
        verdigris: {
          DEFAULT: "#4FA88F",
          light: "#6BC2A8",
        },
        brass: {
          DEFAULT: "#C9A227",
          light: "#E0BC4C",
        },
      },
      fontFamily: {
        display: ["Spectral", "serif"],
        body: ["IBM Plex Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
