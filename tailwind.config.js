/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                ios: {
                    primary: '#007AFF',
                    bg: '#F8F8F8',
                    card: '#FFFFFF',
                    text: {
                        primary: '#1A1A1A',
                        secondary: '#8E8E93',
                    }
                }
            }
        },
    },
    plugins: [],
}
