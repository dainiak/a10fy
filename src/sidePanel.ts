import markdownit from 'markdown-it';
import hljs from 'highlight.js';
import {hljsDarkStyleContent} from "./helpers/styleStrings";

const hljsStyle = document.getElementById("hljsStyle") as HTMLStyleElement;
hljsStyle.textContent = hljsDarkStyleContent;


const markdownRenderer: any  = markdownit({
    html:         false,
    xhtmlOut:     false,
    breaks:       false,
    langPrefix:   "language-",
    linkify:      true,
    typographer:  true,
    quotes: `“”‘’`,
    highlight: (str, lang) => {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return '<pre><code class="hljs">' +
                    hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                    '</code></pre>';
            } catch (__) {}
        }

        return '<pre><code class="hljs">' + markdownRenderer.utils.escapeHtml(str) + '</code></pre>';
    }
});

const result = markdownRenderer.render(`
## Code

Inline \`code\`

Indented code

    // Some comments
    line 1 of code
    line 2 of code
    line 3 of code


Block code "fences"

\`\`\`
Sample text here...
\`\`\`

Syntax highlighting

\`\`\` js
var foo = function (bar) {
  return bar++;
};

console.log(foo(5));
\`\`\`

## Tables

| Option | Description |
| ------ | ----------- |
| data   | path to data files to supply the data that will be passed into templates. |
| engine | engine to be used for processing templates. Handlebars is the default. |
| ext    | extension to be used for dest files. |

Right aligned columns

| Option | Description |
| ------:| -----------:|
| data   | path to data files to supply the data that will be passed into templates. |
| engine | engine to be used for processing templates. Handlebars is the default. |
| ext    | extension to be used for dest files. |
`);


const llmMessageContainer = document.getElementById("llmMessageContainer") as HTMLDivElement;
llmMessageContainer.innerHTML = result;


chrome.storage.session.onChanged.addListener((changes) => {
    const llmMessageChange = changes["llmMessage"];

    if (!llmMessageChange) {
        return;
    }

    updateLlmMessage(llmMessageChange.newValue);
});

document.addEventListener("load", () => {
    chrome.storage.session.get(["llmMessage"]).then((result) => {
        if (result) {
            updateLlmMessage(result["llmMessage"]);
        }
    });
});

function updateLlmMessage(message: string) {
    if (!message)
        return;
    const llmMessageContainer = document.getElementById("llmMessageContainer") as HTMLDivElement;
    llmMessageContainer.innerHTML = message;
}
