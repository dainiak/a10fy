import markdownit, {StateInline} from "markdown-it";
import hljs from "highlight.js";
import katex from "katex";
import TurndownService from "turndown";
import {hljsDarkStyleContent, hljsLightStyleContent} from "../styleStrings";
import {hljsStyle, themeType} from "./htmlElements";

const turndownService = new TurndownService({
    headingStyle: 'atx',
});

hljsStyle.textContent = themeType === "dark" ? hljsDarkStyleContent : hljsLightStyleContent;

const markdownRenderer: any  = markdownit({
    html:         false,
    xhtmlOut:     false,
    breaks:       false,
    langPrefix:   "language-",
    linkify:      true,
    typographer:  true,
    quotes: `“”‘’`,
    highlight: (str, lang) => {
        let hljsLang = lang;
        if (lang === "json-vega-lite") {
            hljsLang = "json";
        }
        let highlightedCode = "";
        if (lang && hljs.getLanguage(hljsLang)) {
            try {
                highlightedCode = hljs.highlight(str, { language: hljsLang, ignoreIllegals: true }).value.trim();
            } catch (__) {}
        }
        highlightedCode ||= markdownRenderer.utils.escapeHtml(str).trim();
        return `<pre class="rounded-2 p-3 hljs language-${lang} code-block"><code class="hljs">${highlightedCode}</code></pre>`;
    }
});

function markdownInlineMathRule(state: StateInline, silent: boolean) {
    const delimiters = [
        { leftDelimiter: '\\(', rightDelimiter: '\\)', isDisplay: false },
        { leftDelimiter: '\\[', rightDelimiter: '\\]', isDisplay: true },
    ]

    for (const { leftDelimiter, rightDelimiter, isDisplay } of delimiters) {
        if (!state.src.slice(state.pos).startsWith(leftDelimiter))
            continue;
        const contentStartPos = state.pos + leftDelimiter.length;
        const rightDelimiterPos = state.src.indexOf(rightDelimiter, contentStartPos);
        if (rightDelimiterPos < 0 || rightDelimiterPos >= state.posMax)
            continue;

        if (!silent) {
            try {
                state.push('html_inline', '', 0).content = katex.renderToString(
                    state.src.slice(contentStartPos, rightDelimiterPos),
                    {
                        throwOnError: true,
                        strict: false,
                        output: 'htmlAndMathml',
                        displayMode: isDisplay,
                    }
                );
            } catch (e) {
                return false;
            }
        }

        state.pos = rightDelimiterPos + rightDelimiter.length;
        return true;
    }
}

markdownRenderer.inline.ruler.after('text', 'escaped_bracket', markdownInlineMathRule);


export {markdownRenderer, turndownService};