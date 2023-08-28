<template>
    <div class="grid justify-center">
        <main class="relative mt-8 basic-card" id="login">
            <h1 class="ml-5">Anmeldung</h1>
            <div v-if="useState<boolean>('loaded') && !loginSuccessful" stage="1" class="login-stage" style="opacity: 1">
                <div class="rounded-button absolute right-4 !px-3 top-2.5" @click="showSchoolSearch">
                    <ClientOnly>
                        <font-awesome-icon :icon="['fas', 'magnifying-glass']"></font-awesome-icon>
                    </ClientOnly>
                    <span class="ml-2">Schule</span>
                </div>
                <form id="login" @submit="handleFormSubmit" class="flex justify-center">
                    <div id="form-wrapper" class="grid w-80 place-content-center">
                        <div class="flex">
                            <input
                                type="text"
                                :disabled="resetInProgress || loginInProgress"
                                v-model="username"
                                name="username"
                                placeholder="Name (Vorname.Nachname)"
                                autofocus
                                required />
                            <input
                                class="w-20 text-center"
                                min="1"
                                max="206568"
                                :disabled="resetInProgress || loginInProgress"
                                type="number"
                                v-model="school"
                                name="school"
                                placeholder="Schule"
                                required />
                        </div>
                        <div class="relative flex items-center">
                            <input
                                type="password"
                                :disabled="resetInProgress || loginInProgress"
                                v-model="password"
                                placeholder="Passwort"
                                name="password"
                                required
                                class="flex-auto" />
                            <ClientOnly>
                                <font-awesome-icon
                                    id="login-password-toggle"
                                    class="rounded-button mx-2 aspect-square"
                                    @mousedown="togglePasswordVisibility"
                                    :icon="['fas', passwordButtonType]"></font-awesome-icon>
                            </ClientOnly>
                        </div>
                        <button :disabled="resetInProgress || loginInProgress">
                            <div v-if="!loginInProgress">
                                <ClientOnly>
                                    <font-awesome-icon class="mr-1" :icon="['fas', 'arrow-right-from-bracket']"></font-awesome-icon>
                                </ClientOnly>
                                <span>Anmelden</span>
                            </div>
                            <div v-else class="spinner" style="--size: 1.5rem"></div>
                        </button>
                    </div>
                </form>
            </div>
            <div v-else-if="loginSuccessful" class="grid place-content-center mt-2 text-center login-stage" stage="2">
                <div class="info">Deine Anmeldedaten bleiben gespeichert</div>
                <ClientOnly>
                    <font-awesome-icon class="text-3xl w-full justify-center mt-2" :icon="['fas', 'check']"></font-awesome-icon>
                </ClientOnly>
                <p>Login erfolgreich</p>
                <small>Die Seite wird gleich neu geladen</small>
            </div>
            <div v-else class="grid mt-3 justify-items-center">
                <div class="spinner" style="--size: 2.5rem"></div>
                <p class="text-center mt-0.5">Wird geladen</p>
            </div>
            <div class="flex justify-center mt-2" v-if="errorMessage">
                <p class="bg-red-500 w-fit px-2 rounded-full shadow-md">
                    {{ errorMessage }}
                </p>
            </div>
        </main>
        <footer class="mt-4 overflow-hidden basic-card" id="reset">
            <h1 class="ml-5">Passwort vergessen</h1>
            <div class="grid my-2 text-center">
                <div v-if="useState<boolean>('loaded') && resetState === 1" class="pw-reset" stage="1">
                    <div class="flex justify-center">
                        <div class="warning">Nur mit hinterlegter E-Mail möglich</div>
                    </div>
                    <div class="select" id="resetType">
                        <div id="student" selected @click="updateResetSelection('student')">
                            <ClientOnly>
                                <font-awesome-icon :icon="['fas', 'child']"></font-awesome-icon>
                            </ClientOnly>
                            Schüler
                        </div>
                        <div id="parent" @click="updateResetSelection('parent')">
                            <ClientOnly>
                                <font-awesome-icon :icon="['fas', 'hands-holding-child']"></font-awesome-icon>
                            </ClientOnly>
                            Eltern
                        </div>
                        <div id="teacher" @click="updateResetSelection('teacher')">
                            <ClientOnly>
                                <font-awesome-icon :icon="['fas', 'user']"></font-awesome-icon>
                            </ClientOnly>
                            Lehrer
                        </div>
                    </div>
                    <form id="reset" @submit="handleResetPassword" class="flex justify-center mt-2">
                        <div id="form-wrapper" class="grid w-80 place-content-center">
                            <input
                                class="w-60"
                                :disabled="resetInProgress"
                                type="text"
                                name="birthday"
                                v-model="birthday"
                                placeholder="Geburtsdatum (dd.mm.yyyy)"
                                required />
                            <input type="text" hidden v-model="username" name="username" placeholder="Name (Vorname.Nachname)" />
                            <input hidden type="number" v-model="school" name="school" placeholder="Schule" />
                            <button :disabled="resetInProgress || loginInProgress">
                                <div v-if="!resetInProgress">Weiter</div>
                                <div v-else class="spinner" style="--size: 1.5rem"></div>
                            </button>
                        </div>
                    </form>
                </div>
                <div v-else-if="resetState === 2" class="pw-reset" stage="2" style="opacity: 0">
                    <div class="flex justify-center mb-2">
                        <div class="info">Du hast keinen Code erhalten?<br />Kontaktiere deine Schule</div>
                    </div>
                    <p class="my-2 leading-4">Du hast einen Code per E-Mail erhalten<br />Dieser ist für 10 Minuten gültig</p>
                    <form name="reset-code" class="flex justify-center" @input="handleResetInput" @keyup="handleResetInput">
                        <input v-for="i in 4" required type="text" :disabled="verifyingCode" />
                        <span>-</span>
                        <input v-for="i in 4" required type="text" :disabled="verifyingCode" />
                        <span>-</span>
                        <input v-for="i in 4" required type="text" :disabled="verifyingCode" />
                    </form>
                </div>
                <div class="pw-reset" v-else-if="resetState === 3" stage="3">
                    <div class="flex justify-center mb-2">
                        <div class="warning">Neues Passwort nach ca.<br />10 Minuten nutzbar</div>
                    </div>
                    <p>
                        Dein neues Passwort ist<br /><b
                            ><u>{{ newPassword }}</u></b
                        >
                    </p>
                    <p>Bei deiner nächsten Anmeldung <b>online</b><br />musst du ein neues Passwort festlegen</p>
                    <button class="button-with-symbol" @click="copyNewPassword">
                        <ClientOnly>
                            <font-awesome-icon :icon="['fas', 'clipboard']"></font-awesome-icon>
                        </ClientOnly>
                        <span>Kopieren</span>
                    </button>
                    <button class="button-with-symbol" @click="openDefaultLogin">
                        <ClientOnly>
                            <font-awesome-icon :icon="['fas', 'up-right-from-square']"></font-awesome-icon>
                        </ClientOnly>
                        <span>Öffnen</span>
                    </button>
                    <button class="button-with-symbol" @click="openDefaultLogin">
                        <ClientOnly>
                            <font-awesome-icon :icon="['fas', 'arrow-rotate-right']"></font-awesome-icon>
                        </ClientOnly>
                        <span>Neu laden</span>
                    </button>
                </div>
                <div v-else class="grid mt-3 justify-items-center">
                    <div class="spinner" style="--size: 2.5rem"></div>
                    <p class="text-center mt-0.5">Wird geladen</p>
                </div>
                <div class="flex justify-center mt-2" v-if="resetErrorMessage">
                    <p class="bg-red-500 w-fit px-2 rounded-full shadow-md">
                        {{ resetErrorMessage }}
                    </p>
                </div>
            </div>
        </footer>
        <dialog id="school-search" class="text-white w-80 h-[60vh] place-content-center rounded-xl focus:outline-none">
            <div class="grid w-full h-full place-content-center">
                <div class="h-[60vh] py-3" v-if="search.loaded">
                    <div class="w-full flex justify-center">
                        <input
                            @input="searchSchools"
                            type="text"
                            class="w-60 h-10 rounded-md drop-shadow-md px-2"
                            placeholder="Suche eine Schule..." />
                        <ClientOnly>
                            <font-awesome-icon
                                @click="closeSchoolSearch"
                                class="rounded-button text-2xl aspect-square self-center ml-2"
                                :icon="['fas', 'xmark']"></font-awesome-icon>
                        </ClientOnly>
                    </div>
                    <div class="mt-5">
                        <ul id="schools" v-for="school in search.results">
                            <li @click="closeSchoolSearch(school.id)">
                                {{ school.name }}
                                <small>{{ school.town }}</small>
                            </li>
                        </ul>
                        <p class="text-center">
                            <span v-if="search.query === ''">Na los! Suche etwas...</span>
                            <span v-else-if="!search.results.length">Keine Ergebnisse gefunden</span>
                        </p>
                    </div>
                </div>
                <div v-else class="spinner" style="--size: 4rem"></div>
            </div>
        </dialog>
    </div>
</template>

<script lang="ts">
// This only exists so that TypeScript doesn't complain about
// all those things that would otherwise be undefined when building
// the list there
interface School {
    id: number;
    name: string;
    town: number;
}
export default defineComponent({
    name: "LoginMenu",
    data() {
        const schools: School[] = [];
        const results: School[] = [];
        return {
            username: "",
            password: "",
            school: null,
            loginInProgress: false,
            loginSuccessful: false,
            errorMessage: "",
            resetErrorMessage: "",
            birthday: "",
            resetInProgress: false,
            resetState: 1,
            // Only used to help inputs to identify whether the code is getting checked
            verifyingCode: false,
            resetData: {
                token: "",
                sid: "",
                ikey: ""
            },
            newPassword: "1",
            passwordButtonType: "eye",
            token: "",
            search: {
                loaded: false,
                schools,
                results,
                query: ""
            }
        };
    },
    computed: {
        element() {
            return document.querySelector("main#login");
        }
    },
    methods: {
        async showSchoolSearch() {
            if (this.loginInProgress || this.resetInProgress || this.loginSuccessful)
                return;
            const dialog = document.querySelector("dialog#school-search");
            if (!(dialog instanceof HTMLDialogElement)) return;

            dialog.showModal();

            if (this.search.loaded) return;

            try {
                const response = await fetch("/schools.json");
                const districts = await response.json();
                if (!Array.isArray(districts)) throw new TypeError("Expected to recieve school districts");
                districts.forEach((district) => district.schools.forEach((school: School) => this.search.schools.push(school)));
                this.search.loaded = true;
            } catch (error) {
                console.error(error);
                useState("api-error").value = {
                    response: error,
                    message: "Konnte Schulen nicht laden"
                };
            }
        },
        closeSchoolSearch(id?: number) {
            const dialog = document.querySelector("dialog#school-search");
            if (!(dialog instanceof HTMLDialogElement)) return;

            // @ts-expect-error
            if (id) this.school = id;

            // @ts-expect-error
            dialog.querySelector("input").value = "";
            this.search.results = [];

            dialog.close();
        },
        searchSchools(event: Event) {
            if (!(event.target instanceof HTMLInputElement)) return;

            this.search.query = event.target.value;
            if (!event.target.value)
                return this.search.results = [];

            const regex = new RegExp(event.target.value, "i");
            this.search.results = this.search.schools.filter((school) => regex.test(school.name)).slice(0, 10);
        },
        togglePasswordVisibility() {
            const input = document.querySelector("form#login input[name=password]");
            const passwordHidden = input?.getAttribute("type") === "password";
            input?.setAttribute("type", passwordHidden ? "text" : "password");
            this.passwordButtonType = passwordHidden ? "eye-slash" : "eye";
        },
        showErrorMessage(text: string, reset?: boolean) {
            const form = document.querySelector("form#" + (reset ? "reset" : "login"));
            clearTimeout(parseInt(form?.getAttribute("error-timeout") || "0"));
            if (reset) this.resetErrorMessage = text;
            else this.errorMessage = text;
            const timeout = setTimeout(() => {
                if (reset) this.resetErrorMessage = "";
                else this.errorMessage = "";
            }, 2000);
            form?.setAttribute("error-timeout", String(timeout));
        },
        async handleFormSubmit(event: Event) {
            event.preventDefault();
            // This either matches a name max.mustermann or a teacher ID like ABC
            if (!/^([A-Z]+\.[A-Z]+(?:-[A-Z]+)?|[A-Z]{3})$/i.test(this.username)) return this.showErrorMessage("Nutzername ungültig");
            if (!this.school || this.school < 1 || this.school > 206568 || !Number.isInteger(this.school))
                return this.showErrorMessage("Schule ungültig", true);
            this.loginInProgress = true;
            try {
                const login = await fetch("/api/login", {
                    method: "POST",
                    headers: [["Content-Type", "application/json"]],
                    body: JSON.stringify({
                        username: this.username,
                        password: this.password,
                        school: this.school
                    })
                });
                const data = await login.json();
                if (data.error) {
                    this.loginInProgress = false;
                    if (data.cooldown) return this.showErrorMessage(`Warte ${data.cooldown} Sekunde${data.cooldown > 1 ? "n" : ""}`);
                    return this.showErrorMessage(login.status === 401 ? "Anmeldedaten falsch" : data.error_details || `Fehler (${login.status})`);
                }
                this.token = data.token;
                useSession().value = data.session;
            } catch (error) {
                return this.showErrorMessage("Netzwerkfehler");
            }

            const element = document.querySelector("main#login");
            // If there would be an issue (very unexpected, should be impossible),
            // we just proceed to the next screen without running the animation
            if (!element || !(element instanceof HTMLElement)) return (this.loginSuccessful = true);
            const oldHeight = element.clientHeight;
            element.style.height = oldHeight + "px";

            element.querySelector(".login-stage[stage='1']")?.animate([{ opacity: 1 }, { opacity: 0 }], {
                duration: 400,
                easing: "ease-in",
                fill: "forwards"
            });

            setTimeout(() => {
                this.loginSuccessful = true;
                setTimeout(() => {
                    element.style.height = "";
                    element.querySelector(".login-stage[stage='2']")?.animate([{ opacity: 0 }, { opacity: 1 }], {
                        duration: 400,
                        easing: "ease-out",
                        fill: "forwards"
                    });
                    const newHeight = element.clientHeight;
                    element.animate([{ height: `${oldHeight}px` }, { height: `${newHeight}px` }], {
                        duration: 400,
                        easing: "ease-in-out"
                    });
                    setTimeout(() => {
                        const credentials = useCookie("credentials", {
                            path: "/",
                            expires: new Date("1/1/2037")
                        });
                        credentials.value = JSON.stringify({
                            username: this.username,
                            password: this.password,
                            school: this.school
                        });
                        useCookie("token", {
                            path: "/",
                            expires: new Date("1/1/2037")
                        }).value = this.token;
                        location.reload();
                    }, 2500);
                }, 0);
            }, 400);
        },
        async handleResetPassword(event: Event) {
            event.preventDefault();
            if (!/^([A-Z]+\.[A-Z]+(?:-[A-Z]+)?|[A-Z]{3})$/i.test(this.username)) return this.showErrorMessage("Trage deinen Namen oben ein", true);
            if (!/^(([12][0-9]|0[1-9]|3[0-1])\.(0[1-9]|11|12)\.(?:19|20)\d{2})$/.test(this.birthday))
                return this.showErrorMessage("Geburtstag ungültig", true);
            if (!this.school || this.school < 1 || this.school > 206568 || !Number.isInteger(this.school))
                return this.showErrorMessage("Trage deine Schule oben ein", true);
            this.resetInProgress = true;
            const types = ["student", "parent", "teacher"];
            const type = types.indexOf(document.querySelector(".select#resetType > div[selected]")?.id || "student");
            try {
                const response = await fetch("/api/resetpassword", {
                    method: "POST",
                    body: JSON.stringify({
                        type,
                        username: this.username,
                        birthday: this.birthday,
                        school: this.school
                    }),
                    headers: [["Content-Type", "application/json"]]
                });
                const data = await response.json();
                if (data.error) {
                    this.resetInProgress = false;
                    return this.showErrorMessage(data.error_details || "Fehler beim Zurücksetzen", true);
                }
                this.resetData = data;
            } catch (error) {
                this.resetInProgress = false;
                return this.showErrorMessage("Netzwerkfehler", true);
            }
            this.setResetState(2);
        },
        updateResetSelection(type: string) {
            if (this.resetInProgress || this.loginInProgress) return;
            document.querySelector(`.select#resetType > div#${type}`)?.setAttribute("selected", "");
            document.querySelectorAll(`.select#resetType > div:not(#${type})`).forEach((x) => x.removeAttribute("selected"));
        },
        setResetState(state: number) {
            const footer = document.querySelector("footer#reset");
            if (!footer || !(footer instanceof HTMLElement)) return;
            const oldHeight = footer.clientHeight;
            footer.style.height = oldHeight + "px";
            footer.querySelector(`.pw-reset[stage='${this.resetState}']`)?.animate([{ opacity: 1 }, { opacity: 0 }], {
                duration: 400,
                easing: "ease-in",
                fill: "forwards"
            });

            setTimeout(() => {
                this.resetState = state;
                // The element has yet to be attached to the DOM
                // so we just wait for all the proxy stuff to be
                // executed and put this right after
                footer.style.height = "";
                setTimeout(() => {
                    footer.querySelector(`.pw-reset[stage='${state}']`)?.animate([{ opacity: 0 }, { opacity: 1 }], {
                        duration: 400,
                        easing: "ease-out",
                        fill: "forwards"
                    });
                    const newHeight = footer.clientHeight;

                    footer.animate([{ height: `${oldHeight}px` }, { height: `${newHeight}px` }], {
                        duration: 400,
                        easing: "ease-in-out"
                    });
                    if (state === 1) {
                        this.resetInProgress = false;
                        this.birthday = "";
                    } else if (state === 2) {
                        document
                            .querySelectorAll(".pw-reset[stage='2'] input")
                            // @ts-expect-error
                            .forEach((element) => (element.value = ""));
                    }
                }, 0);
            }, 400);
        },
        async verifyResetCode() {
            let code = "";
            const satisfied = Array.from(document.querySelectorAll(".pw-reset[stage='2'] input")).every((element, index) => {
                if (!(element instanceof HTMLInputElement)) return true;
                const value = element.value.substring(0, 1);
                if (value === "") {
                    this.verifyingCode = false;
                    element.focus();
                    return false;
                }
                code += `${value}${[3, 7].includes(index) ? "-" : ""}`;
                return true;
            });
            if (!satisfied) return;
            if (!/^([a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4})$/i.test(code)) return this.showErrorMessage("Code kann nicht gültig sein", true);
            this.verifyingCode = true;
            try {
                const raw = await fetch("/api/resetpassword", {
                    method: "PUT",
                    body: JSON.stringify({
                        token: this.resetData.token,
                        ikey: this.resetData.ikey,
                        sid: this.resetData.sid,
                        code
                    }),
                    headers: [["Content-Type", "application/json"]]
                });
                const data = await raw.json();
                if (data.error) {
                    this.resetInProgress = false;
                    this.showErrorMessage(data.error_details || "Fehler beim Zurücksetzen", true);
                    return setTimeout(() => {
                        this.setResetState(1);
                        this.verifyingCode = false;
                    }, 2000);
                }

                this.newPassword = data.password;
            } catch (error) {
                this.resetInProgress = false;
                this.verifyingCode = false;
                this.showErrorMessage("Fehler beim Zurücksetzen", true);
                return setTimeout(() => {
                    this.setResetState(1);
                    this.verifyingCode = false;
                }, 2000);
            }

            this.verifyingCode = false;
            this.setResetState(3);
        },
        async handleResetInput(event: Event) {
            function getOtherElement(element: HTMLInputElement, action: "nextElementSibling" | "previousElementSibling"): HTMLInputElement | null {
                const other = element[action];
                if (other === null) return null;
                if (!(other instanceof HTMLInputElement)) {
                    const otherSquared = other[action];
                    if (!(otherSquared instanceof HTMLInputElement)) return null;
                    return otherSquared;
                }
                return other;
            }
            if (!(event.target instanceof HTMLInputElement)) return;
            // Must be a keydown - we want to check for backspace
            if (event instanceof KeyboardEvent) {
                if (event.key !== "Backspace") return;
                const previous = getOtherElement(event.target, "previousElementSibling");
                if (previous === null) return;
                previous.focus();
                previous.value = "";
            }
            if (!(event instanceof InputEvent)) return;
            // Multiple characters have been pasted
            if (event.target.value.length > 1) {
                let element = event.target;
                const characters = element.value.replace(/-/g, "").split("");
                characters.every((character, index) => {
                    element.value = character;
                    const next = getOtherElement(element, "nextElementSibling");
                    if (next === null) return false;
                    element = next;
                    if (index === characters.length - 1) element.focus();
                    return true;
                });
            }
            // One character has been typed -> one forwards
            else getOtherElement(event.target, "nextElementSibling")?.focus();
            if (document.forms.namedItem("reset-code")?.checkValidity()) this.verifyResetCode();
        },
        copyNewPassword() {
            window.navigator.clipboard.writeText(this.newPassword);
        },
        openDefaultLogin() {
            window.open("https://login.schulportal.hessen.de/?i=" + this.school, "_blank");
        }
    }
});
</script>

<style scoped>
#form-wrapper > * {
    @apply my-1;
}
form {
    input {
        background: var(--element-color);
        @apply mx-1.5 rounded-md h-10 placeholder-gray-400 pl-2 shadow-md;
    }
    input:not([name="password"]) {
        @apply px-2;
    }
    button {
        @apply h-10 rounded-md mx-1.5 grid place-content-center hover:active:scale-[0.95];
        transition: transform 200ms;
        background: linear-gradient(to bottom, #18d6ee, #3a7cd5);
    }
    button:disabled {
        background: var(--element-color);
    }
}
.pw-reset[stage="2"] {
    input {
        @apply h-12 w-5 p-0 text-center mx-0.5;
    }
    span {
        @apply h-12 grid content-center;
    }
}
#school-search::backdrop {
    background: #00000090;
}
#school-search {
    background: linear-gradient(to bottom, #282828, #121212);
    input {
        background: var(--element-color);
    }
    li {
        background: linear-gradient(to bottom, #343434, #2c2c2c);
        @apply my-1 mx-3 rounded-md px-2 text-xl hover:active:scale-95;
        transition: transform 100ms;
        small {
            font-size: 0.8rem;
        }
    }
}
</style>
