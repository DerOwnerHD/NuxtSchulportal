export const syntaxHighlight = (json: any = {}) =>
    JSON.stringify(json, null, 2)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/gm, (match) => {
            let type = "number";
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    type = "key";
                } else {
                    type = "string";
                }
            } else if (/true|false/.test(match)) {
                type = "boolean";
            } else if (/null/.test(match)) {
                type = "null";
            }
            return `<span class="${type}">${match}</span>`;
        });
