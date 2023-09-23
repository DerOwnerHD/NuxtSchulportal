// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    devtools: { enabled: false },
    modules: ["@nuxtjs/tailwindcss"],
    css: ["@fortawesome/fontawesome-svg-core/styles.css", "assets/main.css"],
    ssr: true,
    devServer: {
        port: 80
    },
    runtimeConfig: {
        notificationApi: {
            url: process.env.NOTIFICATION_API_URL,
            key: process.env.NOTIFICATION_API_KEY
        },
        rateLimitBypass: process.env.RATELIMIT_BYPASS_KEY,
        public: {
            vapidPublicKey: "BNl0RNQwHriSgY-lij0VR0zod5itizA8NiQx4KxRwX070zJncm3PoKGuB0-0w0zDCoN4ZxSuPZall-t0wb4eAQI"
        }
    }
});
