<template>
    <main v-if="cardsOpen.includes('moodle')">
        <div class="mb-2 relative rounded-2xl w-[90%] mx-[5%] z-0 gradient-border max-w-[18rem] text-white" :visible="fadeInCourses()">
            <div class="px-5 py-2">
                <div id="courses">
                    <h1>Deine Kurse</h1>
                    <div class="grid place-content-center py-2" v-if="appErrors['moodle-courses'] != null">
                        <div class="error">
                            <span>{{ appErrors["moodle-courses"] }}</span>
                        </div>
                    </div>
                    <div v-else-if="courses == null" class="flex overflow-x-auto">
                        <article class="placeholder" v-for="n in 3">
                            <div></div>
                            <small></small>
                            <small></small>
                        </article>
                    </div>
                    <div v-else class="flex overflow-x-auto">
                        <article v-for="course of courses" @click="openLink(course.link)" class="opacity-0">
                            <div :style="`background-image: url(${ proxyCourseImage(course.image) })`"></div>
                            <small>{{ course.names.short }}</small>
                        </article>
                    </div>
                </div>
                <div id="events" class="mt-4 pt-2">
                    <h1>Anstehende Abgaben</h1>
                    <small>Bald...</small>
                </div>
            </div>
        </div>
    </main>
    <footer>
        <button @click="openLink('https://start.schulportal.hessen.de/schulmoodle.php')">
            <ClientOnly>
                <font-awesome-icon :icon="['fas', 'up-right-from-square']"></font-awesome-icon>
            </ClientOnly>
            <span>Öffnen</span>
        </button>
    </footer>
</template>

<script lang="ts">
export default defineComponent({
    name: "Moodle",
    data() {
        return {
            cardsOpen: useState<string[]>("cards-open"),
            appErrors: useAppErrors(),
            courses: useState<MoodleCourse[]>("moodle-courses"),
            moodleCredentials: useMoodleCredentials(),
            credentials: useCredentials<Credentials>()
        };
    },
    methods: {
        proxyCourseImage(image?: string) {

            if (!image) return null;
            if (/$data:image/.test(image)) return image;
            const path = image.split(".schule.hessen.de")[1];
            if (!/\/pluginfile.php\/\d{1,10}\/.*/.test(path)) return image;
            return `/api/moodle/proxy?cookie=${this.moodleCredentials.cookie}&school=${this.credentials.school}&paula=${this.moodleCredentials.paula}&path=${path}`;

        },
        async fadeInCourses() {
            await useWait(1);
            if (!Array.isArray(this.courses) || !this.courses.length) return;
            const elements = document.querySelectorAll("article[card=moodle] #courses article");
            elements.forEach(async (element, index) => {
                await useWait(index * 80);
                element.animate([
                    { opacity: 0, transform: "scale(90%)" },
                    { opacity: 1, transform: "scale(100%)" }
                ], {
                    duration: 500, fill: "forwards", easing: "ease-in-out"
                });
            })
        }
    },
    watch: {
        courses() {
            this.fadeInCourses();    
        }
    }
});
</script>

<style scoped>
@keyframes loading {
    0% {
        transform: translateX(-100%);
    }
    30% {
        opacity: 50%;
        transform: translateX(-100%);
    }
    100% {
        opacity: 100%;
        transform: translateX(300%);
    }
}
#courses {
    article.placeholder {
        small {
            @apply w-full h-3 rounded-full;
        }
        small, div {
            background: #3c445c;
            @apply drop-shadow relative;
        }
    }
    article {
        div {
            @apply h-12 rounded-md bg-center;
            background-size: cover;
        }
        small {
            @apply mt-1 block;
        }
        @apply h-[5rem] min-w-[3.5rem] w-14 overflow-hidden text-ellipsis text-center mt-1 mr-3;
        line-break: anywhere;
        line-height: 0.75;
    }
    article:not(.placeholder):hover:active {
        @apply scale-95;
    }
    ::-webkit-scrollbar {
        display: none;
    }
}
#events {
    border-top: solid 1px;
    border-image: linear-gradient(to left, #00000000 0%, #ffffff 50%, #00000000 100%) 1;
}
</style>
