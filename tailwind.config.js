import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
        './resources/js/**/*.tsx',
        './resources/js/**/*.ts',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
            },
            colors: {
                'green-primary': '#63D44A',
                'green-progress': '#3BC25B',
                'green-interactive': '#1FAF8E',
                'green-analytics': '#0E8F79',
                dark: {
                    bg: '#0a0a0a',
                    card: '#111111',
                    card2: '#161616',
                    border: '#2a2a2a',
                    text: '#ffffff',
                    muted: '#a0a0a0',
                    subtle: '#555555',
                },
                light: {
                    bg: '#f5f5f5',
                    card: '#ffffff',
                    card2: '#f9f9f9',
                    border: '#e0e0e0',
                    text: '#111111',
                    muted: '#555555',
                    subtle: '#888888',
                },
            },
            borderRadius: {
                'card': '10px',
                'modal': '12px',
                'btn': '8px',
            },
            boxShadow: {
                'card': '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
                'card-dark': '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
                'modal': '0 20px 60px rgba(0,0,0,0.3)',
            },
        },
    },

    plugins: [forms],
};
