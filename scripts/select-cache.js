// Caches all subpages of the Select system (which is available to all, even unauthed)
// This does not get refreshed often and is VERY big, thus it is not worth the effort to refresh this constantly
const { JSDOM } = require("jsdom");
const fs = require("fs/promises");

const SELECT_BASE_URL = "https://select.bildung.hessen.de/";
async function fetchBaseLinks() {
    const response = await fetch(SELECT_BASE_URL);
    const document = await responseToDOM(response);
    const categories = Array.from(document.querySelectorAll("#content_main .content > div:not(.clear)")).map((element) => {
        const buttons = Array.from(element.querySelectorAll(".buttons a[href]")).map((button) => {
            const img = button.querySelector("img");
            return {
                link: button.getAttribute("href").replace(/^\.\//, ""),
                icon: img.getAttribute("src"),
                text: img.getAttribute("alt")
            };
        });
        const name = element.classList[0].replace(/(bg_)|(_01)/gi, "");
        return { buttons, name };
    });
    return categories;
}

async function fetchElements(link) {
    const response = await fetch(link.startsWith(SELECT_BASE_URL) ? link : SELECT_BASE_URL + link, {
        headers: [["User-Agent", "Schulportal-Select-Cache"]]
    });
    console.log("fetched " + link);
    const document = await responseToDOM(response);
    const elements = Array.from(document.querySelectorAll("#content_main section > div > *:not(a[name])")).filter((x) => !x.classList.contains("u"));

    if (elements.some((x) => x.classList.contains("col-xs-12"))) return readFinalElements(document);

    const sorted = { default: [] };
    let currentHeader = "default";
    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        if (element.outerHTML.startsWith("<div")) {
            currentHeader = element.innerHTML;
            sorted[currentHeader] = [];
            continue;
        }
        sorted[currentHeader].push({
            link: element.getAttribute("href"),
            name: element.childNodes[0].textContent.trim(),
            count: parseInt(element.querySelector("span.badge")?.innerHTML) || null,
            children: await fetchElements(element.getAttribute("href"))
        });
    }

    if (!sorted.default.length) delete sorted.default;

    return sorted;
}

function readFinalElements(document) {
    return Array.from(document.querySelectorAll("#content_main section > div > div.well")).map((element) => {
        const title = element.querySelector(".col-xs-12:first-child a");
        return {
            title: title.innerHTML.trim(),
            link: title.getAttribute("href"),
            content:
                removeBreaks(
                    element
                        .querySelector(".col-xs-10")
                        ?.innerHTML.replace(/class="[^"]*"/gi, "")
                        .trim()
                ) ?? null,
            age: element.querySelector(".col-xs-2 > .col-xs-12:first-child span i")?.innerHTML ?? null
        };
    });
}

async function responseToDOM(response) {
    return new JSDOM(await response.text()).window.document;
}

async function main() {
    const categories = await fetchBaseLinks();
    for (const category of categories) {
        let index = 0;
        for (const button of category.buttons) {
            const content = await fetchElements(button.link);
            category.buttons[index++].content = content;
        }
    }
    await fs.writeFile("select.json", JSON.stringify(categories));
    console.log("Done!");
}

main();

function removeBreaks(text) {
    return text
        .replace(/(\r\n|\n|\r)/gm, "<1br />")
        .replace(/<1br \/><1br \/><1br \/>/gi, "<1br /><2br />")
        .replace(/<1br \/><1br \/>/gi, "")
        .replace(/\<1br \/>/gi, " ")
        .replace(/\s+/g, " ")
        .replace(/<2br \/>/gi, "\n\n");
}
