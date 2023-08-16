// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    devtools: { enabled: false },
    modules: ["@nuxtjs/tailwindcss"],
    css: ["@fortawesome/fontawesome-svg-core/styles.css", "assets/main.css"],
    ssr: true,
    devServer: {
        port: 80
    }
});
