// apps/mobile/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
    // NOTE: Adjust paths if you have a different folder structure (e.g., src)
    content: ["./App.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                primary: "#10B981", // Emerald
            }
        },
    },
    plugins: [],
}
