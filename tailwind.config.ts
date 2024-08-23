import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        black: "#1E1E1C",
        "dark-black": "#181816",
        "light-black": "#353533",
        green: "#1E8571",
        "dark-green": "#186a5a",
        "light-green": "#35917f",
        white: "#FFFFFF",
      },
      gridTemplateColumns: {
        "16": "repeat(16, minmax(0, 1fr));",
        "14": "repeat(14, minmax(0, 1fr));",
      },
      keyframes: {
        tada: {
          "0%": {
            transform: "scale3d(1, 1, 1)",
          },
          "10%, 20%": {
            transform: "scale3d(0.9, 0.9, 0.9) rotate3d(0, 0, 1, -3deg)",
          },
          "30%, 50%, 70%, 90%": {
            transform: "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg)",
          },
          "40%, 60%, 80%": {
            transform: "scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg)",
          },
          "100%": {
            transform: "scale3d(1, 1, 1)",
          },
        },
      },
      animation: {
        tada: "tada 1s ease-in-out 0.25s infinite",
      },
    },
  },
  darkMode: "class",
  plugins: [require("@tailwindcss/aspect-ratio")],
};
export default config;
