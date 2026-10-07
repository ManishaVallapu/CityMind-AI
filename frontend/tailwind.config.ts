import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        civic: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#bae0fd",
          300: "#7cc8fb",
          400: "#36acf6",
          500: "#0c91e7",
          600: "#0173c6",
          700: "#025ca1",
          800: "#064e84",
          900: "#0a416e",
          950: "#072a49",
        },
        navy: {
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
        slate: {
          DEFAULT: "#64748b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
