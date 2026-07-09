/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090b', // zinc-950
        surface: '#18181b',    // zinc-900
        primary: '#3b82f6',    // blue-500
        accent: '#8b5cf6',     // violet-500
        danger: '#ef4444',     // red-500
        success: '#22c55e',    // green-500
      }
    },
  },
  plugins: [],
}
