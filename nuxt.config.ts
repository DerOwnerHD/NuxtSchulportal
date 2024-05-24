// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    devtools: { enabled: false },
    app: {
        pageTransition: {
            name: "page",
            mode: "out-in"
        },
        head: {
            htmlAttrs: {
                lang: "de"
            },
            title: "Schulportal Hessen",
            link: [
                { rel: "preload", href: "/font/regular.otf", as: "font", type: "font/otf" },
                { rel: "preload", href: "/font/semibold.otf", as: "font", type: "font/otf" },
                { rel: "preload", href: "/font/bold.otf", as: "font", type: "font/otf" }
            ]
        }
    },
    modules: ["@nuxtjs/tailwindcss", "@nuxt/image"],
    css: ["@fortawesome/fontawesome-svg-core/styles.css", "assets/main.css"],
    ssr: true,
    devServer: { port: 80 },
    runtimeConfig: {
        private: {
            notificationApi: {
                url: process.env.NOTIFICATION_API_URL,
                key: process.env.NOTIFICATION_API_KEY
            },
            rateLimitBypass: process.env.RATELIMIT_BYPASS_KEY
        },
        public: {
            vapidPublicKey: "BNl0RNQwHriSgY-lij0VR0zod5itizA8NiQx4KxRwX070zJncm3PoKGuB0-0w0zDCoN4ZxSuPZall-t0wb4eAQI",
            currentSemester: process.env.CURRENT_SEMESTER,
            baseMoodleURL: process.env.BASE_MOODLE_URL
        }
    },
    build: {
        transpile: [
            "@fortawesome/fontawesome-svg-core",
            "@fortawesome/free-brands-svg-icons",
            "@fortawesome/free-regular-svg-icons",
            "@fortawesome/free-solid-svg-icons",
            "@fortawesome/vue-fontawesome"
        ]
    }
});
