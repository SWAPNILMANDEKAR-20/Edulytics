/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#2563EB",
          purple: "#7C3AED",
          emerald: "#10B981",
        },
        bg: {
          base: "#0A0E1A",
          card: "#0F1424",
        },
        status: {
          success: "#10B981",
          warning: "#F59E0B",
          error: "#EF4444",
        },
        theme: {
          bg: "var(--bg)",
          card: "var(--card)",
          primary: "var(--primary)",
          accent: "var(--accent)",
          success: "var(--success)",
          warning: "var(--warning)",
          danger: "var(--danger)",
          text: "var(--text-primary)",
          muted: "var(--text-muted)",
          border: "var(--border)",
        }
      },
      borderRadius: {
        'card': '20px',
        'input': '12px',
        'badge': '10px',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
