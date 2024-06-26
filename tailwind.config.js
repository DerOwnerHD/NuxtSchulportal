/** @type {import('tailwindcss').Config} */
// eslint-disable-next-line no-undef
module.exports = {
    content: ["./src/**/*.{js,vue}"],
    theme: {
        extend: {
            spacing: {
                "-1": "-0.25rem",
                "-2": "-0.5rem",
                "-3": "-0.75rem",
                "-4": "-1rem"
            },
            content: {
                empty: '""'
            }
        }
    },
    plugins: []
};
