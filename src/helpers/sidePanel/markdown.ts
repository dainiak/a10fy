import type katex from "katex";
import type HLJSApi from "highlight.js";

import markdownit, {StateInline} from "markdown-it";
import TurndownService from "turndown";
import {hljsDarkStyleContent, hljsLightStyleContent} from "../styleStrings";
import {hljsStyle, themeType} from "./htmlElements";
import {escapeToHTML} from "../domTools";

interface Window {
    katex: typeof katex;
    hljs: typeof HLJSApi;
}

const katexRenderToString: typeof katex.renderToString = (window as any as Window).katex.renderToString;
const highlighter: typeof HLJSApi = (window as any as Window).hljs;

export const turndownService = new TurndownService({
    headingStyle: 'atx',
});

hljsStyle.textContent = themeType === "dark" ? hljsDarkStyleContent : hljsLightStyleContent;

export const markdownRenderer = markdownit({
    html:         false,
    xhtmlOut:     false,
    breaks:       false,
    langPrefix:   "language-",
    linkify:      true,
    typographer:  true,
    quotes: `“”‘’`,
    highlight: (str, lang) => {
        lang = lang.trim().toLowerCase();
        let hljsLang = lang;
        if (lang.includes("json")) {
            hljsLang = "json";
        } else if (lang.includes("yaml") || lang.includes("yml")) {
            hljsLang = "yaml";
        }
        let highlightedCode = "";
        if (lang && highlighter.getLanguage(hljsLang)) {
            try {
                highlightedCode = highlighter.highlight(str, { language: hljsLang, ignoreIllegals: true }).value.trim();
            } catch (__) {}
        }
        highlightedCode ||= markdownRenderer.utils.escapeHtml(str).trim();
        return `<pre class="rounded-2 p-3 hljs language-${lang} code-block"><code class="hljs">${highlightedCode}</code></pre>`;
    }
});


function addMathRendering(pandocCompatible: boolean = false) {
    const checkDollarDelimiterValidity = (state: StateInline, pos: number) => {
        let i = pos - 1;
        while (i >= 0 && state.src[i] === "\\") {
            i -= 1;
        }
        if ((pos - i) % 2 === 1) {
            return {
                canOpen: false,
                canClose: false,
            }
        }

        let canOpen = true;
        let canClose = true;
        const prevChar = pos > 0 ? state.src.charAt(pos - 1) : "_";
        const nextChar = pos + 1 <= state.posMax ? state.src.charAt(pos + 1) : "_";

        if (" \t".includes(prevChar) || "0123456789".includes(nextChar)) {
            canClose = false;
        }
        if (" \t".includes(nextChar)) {
            canOpen = false;
        }

        return {canOpen, canClose};
    }

    markdownRenderer.inline.ruler.after("text", "latex_delimiters", (state: StateInline, silent: boolean) => {
        const delimiters = [
            {leftDelimiter: "\\(", rightDelimiter: "\\)", isDisplay: false},
            {leftDelimiter: "\\[", rightDelimiter: "\\]", isDisplay: true},
            {leftDelimiter: "$$", rightDelimiter: "$$", isDisplay: true},
            {leftDelimiter: "$", rightDelimiter: "$", isDisplay: false},
        ]

        for (const {leftDelimiter, rightDelimiter, isDisplay} of delimiters) {
            if (!state.src.slice(state.pos).startsWith(leftDelimiter))
                continue;
            if(pandocCompatible && leftDelimiter === "$" && !checkDollarDelimiterValidity(state, state.pos + leftDelimiter.length).canOpen)
                return false;
            const contentStartPos = state.pos + leftDelimiter.length;
            let rightDelimiterPos = state.src.indexOf(rightDelimiter, contentStartPos);
            if(pandocCompatible && rightDelimiter === "$" && !checkDollarDelimiterValidity(state, rightDelimiterPos).canClose)
                return false;
            if (rightDelimiterPos < 0 || rightDelimiterPos >= state.posMax)
                continue;

            if (!silent) {
                const latexCode = state.src.slice(contentStartPos, rightDelimiterPos);
                try {
                    state.push('html_inline', '', 0).content = katexRenderToString(
                        latexCode,
                        {
                            throwOnError: true,
                            strict: false,
                            output: 'htmlAndMathml',
                            displayMode: isDisplay,
                        }
                    );
                } catch (e) {
                    state.push('html_inline', '', 0).content = `<span class="katex-error">${escapeToHTML(latexCode)}</span>`;
                }
            }

            state.pos = rightDelimiterPos + rightDelimiter.length;
            return true;
        }
        return false;
    });
}

addMathRendering();