import {markdown} from "@codemirror/lang-markdown";
import {languages} from "@codemirror/language-data";
import {oneDark} from "@codemirror/theme-one-dark";
import {themeType} from "./sidePanel/htmlElements";

import {liquid} from "@codemirror/lang-liquid";
import {liquidFilters} from "./sidePanel/liquid";

import {closeBrackets, closeBracketsKeymap, autocompletion} from '@codemirror/autocomplete';
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
    dropCursor,
    EditorView,
    highlightActiveLine,
    highlightActiveLineGutter,
    highlightSpecialChars,
    keymap,
    lineNumbers,
    rectangularSelection,
    drawSelection,
    crosshairCursor
} from '@codemirror/view';

export function createMarkdownCodeMirror(targetElement: HTMLElement, initialText: string, saveCommand: (_: EditorView) => void) {
    const extensions = [
        markdown({codeLanguages: languages}),
        lineNumbers(),
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
        lineNumbers(),
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