import {markdown} from "@codemirror/lang-markdown";
import {pythonLanguage} from "@codemirror/lang-python";
import {javascriptLanguage, jsxLanguage, typescriptLanguage} from "@codemirror/lang-javascript";
import {jsonLanguage} from "@codemirror/lang-json";
import {yamlLanguage} from "@codemirror/lang-yaml";
import {mermaidLanguage} from "codemirror-lang-mermaid";
import {StreamLanguage} from "@codemirror/language";
import {sql} from "@codemirror/lang-sql"
import {shell} from "@codemirror/legacy-modes/mode/shell";
import {javaLanguage} from "@codemirror/lang-java";
import {goLanguage} from "@codemirror/lang-go";
import {c, cpp, csharp} from "@codemirror/legacy-modes/mode/clike";
import {stex} from "@codemirror/legacy-modes/mode/stex";
import {rustLanguage} from "@codemirror/lang-rust";
import {phpLanguage} from "@codemirror/lang-php";
import {htmlLanguage} from "@codemirror/lang-html";
import {cssLanguage} from "@codemirror/lang-css";
import {oneDark} from "@codemirror/theme-one-dark";
import {themeType} from "./sidePanel/htmlElements";

import {liquid, liquidLanguage} from "@codemirror/lang-liquid";
import {liquidFilters} from "./sidePanel/liquid";

import {autocompletion, closeBrackets, closeBracketsKeymap} from '@codemirror/autocomplete';
import {defaultKeymap, history, historyKeymap} from '@codemirror/commands';
import {highlightSelectionMatches, searchKeymap} from '@codemirror/search';
import {EditorState, Prec} from '@codemirror/state';
import {
    bracketMatching,
    defaultHighlightStyle,
    foldGutter,
    foldKeymap,
    indentOnInput,
    syntaxHighlighting
} from '@codemirror/language';
import {
    crosshairCursor,
    drawSelection,
    dropCursor,
    EditorView,
    highlightActiveLine,
    highlightActiveLineGutter,
    highlightSpecialChars,
    keymap,
    lineNumbers,
    rectangularSelection
} from '@codemirror/view';

export function createMarkdownCodeMirror(targetElement: HTMLElement, initialText: string, saveCommand: (_: EditorView) => void) {
    const extensions = [
        markdown({codeLanguages: (info) => {
            info = info.trim().toLowerCase();
            if(info === "python") return pythonLanguage;
            if(["javascript", "ecmascript", "js"].includes(info)) return javascriptLanguage;
            if(info === "jsx") return jsxLanguage;
            if(info === "typescript") return typescriptLanguage;
            if(info === "html") return htmlLanguage;
            if(info === "css") return cssLanguage;
            if(info === "liquid") return liquidLanguage;
            if(info === "mermaid") return mermaidLanguage;
            if(info === "java") return javaLanguage;
            if(info === "go") return goLanguage;
            if(info === "c") return StreamLanguage.define(c);
            if(info === "cpp") return StreamLanguage.define(cpp);
            if(info === "csharp") return StreamLanguage.define(csharp);
            if(info === "rust") return rustLanguage;
            if(info === "php") return phpLanguage;
            if(["tex", "latex"].includes(info)) return StreamLanguage.define(stex);
            if(info.includes("json")) return jsonLanguage;
            if(info.includes("yaml") || info.includes("yml")) return yamlLanguage;
            if(["shell", "sh", "bash"].includes(info)) return StreamLanguage.define(shell);
            if(info.includes("sql")) return sql().language;
            return null;
        }}),
        // lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        EditorView.lineWrapping,
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, {fallback: true}),
        bracketMatching(),
        closeBrackets(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        // EditorView.domEventHandlers({
        //     drop(event, view) {
        //         use turndownService to convert HTML to markdown
        //     },
        //     paste(event, view) {
        //         use turndownService to convert HTML to markdown
        //     }
        // }),
        keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...foldKeymap,
        ]),
        Prec.highest(
            keymap.of([
                { key: "Mod-Enter", run: (editorView) =>{ saveCommand(editorView); return true; }}
            ])
        )
    ];
    if (themeType === "dark") {
        extensions.push(oneDark);
    }

    return new EditorView({
        parent: targetElement,
        state: EditorState.create({
            doc: initialText,
            extensions: extensions,
        }),
    })
}


export function createLiquidCodeMirror(targetElement: HTMLElement, initialText: string, saveCommand: (_: EditorView) => void, scope: object) {
    const extensions = [
        liquid({
            filters: liquidFilters.map(filter => {return {label: filter.name, info: filter.description}}),
            variables: Object.keys(scope).map(key => {return {label: key}}),
            properties: (path) => {
                const entry = Object.entries(scope).find(e => e[0] == path[0]);
                if(path.length === 1 && entry && entry[1] instanceof Object)
                    return Object.keys(entry[1]).map(key => {return {label: key}});
                return [];
            }
        }),
        autocompletion(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        EditorView.lineWrapping,
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, {fallback: true}),
        bracketMatching(),
        closeBrackets(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...foldKeymap,
        ]),
        Prec.highest(
            keymap.of([
                { key: "Mod-Enter", run: (editorView) =>{ saveCommand(editorView); return true; }}
            ])
        )
    ];
    if (themeType === "dark") {
        extensions.push(oneDark);
    }
    return new EditorView({
        parent: targetElement,
        state: EditorState.create({
            doc: initialText,
            extensions: extensions
        }),
    })
}

export {EditorView};