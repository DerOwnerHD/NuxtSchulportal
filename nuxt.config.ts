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
        private: {
            notificationApiUrl: process.env.NOTIFICATION_API_URL,
            notificationApiKey: process.env.NOTIFICATION_API_KEY
        }
    }
});
