import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "black-base": "#000000",
        panel: "#1a1d27",
        crimson: "#9a0000",
        "crimson-light": "#DC143C",
        progress: "#1d9e75",
        milestone: "#ef9f27",
        "silver-1": "#A8A8A8",
        "silver-2": "#C0C0C0",
        "white-soft": "#F5F5F5",
      },
    },
  },
} satisfies Config;
