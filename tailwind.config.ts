import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#f3f0e8",
        ink: "#1f2937",
        accent: "#2563eb"
      },
      boxShadow: {
        panel: "0 12px 40px rgba(15, 23, 42, 0.08)",
        page: "0 24px 80px rgba(15, 23, 42, 0.14)"
      }
    }
  },
  plugins: []
};

export default config;
