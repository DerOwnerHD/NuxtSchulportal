<template>
    <main v-if="cardsOpen.includes('moodle')">
        <div class="mb-2 relative rounded-2xl w-[90%] mx-[5%] z-0 gradient-border max-w-[18rem] text-white">
            <div class="px-5 py-2">
                <div id="courses">
                    <h1>Deine Kurse</h1>
                    <div class="grid place-content-center py-2" v-if="appErrors['moodle-courses'] != null">
                        <div class="error">
                            <span>{{ appErrors["moodle-courses"] }}</span>
                        </div>
                    </div>
                    <div v-else-if="courses == null" class="flex overflow-x-auto">
                        <article class="placeholder" v-for="n in 4">
                            <div></div>
                            <small></small>
                            <small></small>
                        </article>
                    </div>
                    <div v-else class="flex overflow-x-auto">
                        <article v-for="course of courses" @click="openLink(course.link)" class="opacity-0">
                            <div :style="`background-image: url(${proxyCourseImage(course.image)})`"></div>
                            <small>{{ course.names.short }}</small>
                        </article>
                    </div>
                </div>
                <div id="events" class="mt-4 pt-2">
                    <h1>Anstehende Abgaben</h1>
                    <div class="grid place-content-center py-2" v-if="appErrors['moodle-events'] != null">
                        <div class="error">
                            <span>{{ appErrors["moodle-events"] }}</span>
                        </div>
                    </div>
                    <ul v-else-if="events == null">
                        <li class="placeholder" v-for="n in 2">
                            <small></small>
                        </li>
                    </ul>
                    <ul v-else-if="events.length">
                        <li v-for="event of events.slice(0, 2)" style="opacity: 0" @click="openLink(event.links.view)">
                            <div>
                                <img :src="event.icon.url" />
                            </div>
                            <small>{{ event.name }}</small>
                        </li>
                    </ul>
                    <div class="text-center" v-if="events != null && !appErrors['moodle-events']">
                        <small v-if="!events.length">Keine Abgaben</small>
                        <small v-if="events.length > 2">{{ events.length - 2 }} weitere Abgabe{{ events.length > 3 ? "n" : "" }}</small>
                    </div>
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
            events: useState<MoodleEvent[]>("moodle-events"),
            moodleCredentials: useMoodleCredentials(),
            credentials: useCredentials<Credentials>()
        };
    },
    props: {
        extended: { type: Boolean, required: true }
    },
    methods: {
        proxyCourseImage(image?: string) {
            if (!image) return null;
            if (/$data:image/.test(image)) return image;
            const path = image.split(".schule.hessen.de")[1];
            if (!/\/pluginfile.php\/\d{1,10}\/.*/.test(path)) return image;
            return `/api/moodle/proxy?cookie=${this.moodleCredentials.cookie}&school=${this.credentials.school}&paula=${this.moodleCredentials.paula}&path=${path}`;
        },
        async fadeIn(type: "all" | "courses" | "events") {
            if (!this.extended) return;
            async function fadeInElement(element: Element, index: number) {
                if (!(element instanceof HTMLElement)) return;
                await useWait(index * 80);
                element.animate(
                    [
                        { opacity: 0, transform: "scale(90%)" },
                        { opacity: 1, transform: "scale(100%)" }
                    ],
                    400
                );
                await useWait(390);
                element.style.opacity = "1";
            }
            await useWait(10);
            if (!Array.isArray(this.courses) || !this.courses.length) return;
            const courses = document.querySelectorAll("article[card=moodle] #courses article");
            const events = document.querySelectorAll("article[card=moodle] #events li");
            if (["all", "events".includes(type)]) events.forEach(fadeInElement);
            if (["all", "courses".includes(type)]) courses.forEach(fadeInElement);
        }
    },
    watch: {
        courses() {
            this.fadeIn("courses");
        },
        events() {
            this.fadeIn("events");
        },
        extended() {
            this.fadeIn("all");
        }
    }
});
</script>

<style scoped>
#courses {
    article.placeholder {
        small {
            @apply w-full h-3 rounded-full;
        }
        small,
        div {
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
        line-height: 0.8;
    }
    article:not(.placeholder):hover:active {
        @apply scale-95;
    }
    ::-webkit-scrollbar {
        display: none;
    }
}
#events {
    ul {
        @apply mt-2;
    }
    li.placeholder {
        small {
            @apply w-full h-3 rounded-full block drop-shadow;
        }
    }
    li {
        @apply h-5 w-full flex my-2 items-center;
        small {
            @apply whitespace-nowrap text-ellipsis overflow-hidden ml-1;
        }
        div {
            @apply bg-white rounded-full grid place-content-center w-6 h-6 aspect-square;
            img {
                @apply w-4;
            }
        }
    }
    li:not(.placeholder):hover:active {
        @apply scale-95;
    }
    border-top: solid 1px;
    border-image: linear-gradient(to left, #00000000 0%, #ffffff 50%, #00000000 100%) 1;
}
</style>
