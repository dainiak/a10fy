import {markdown} from "@codemirror/lang-markdown";
import {languages} from "@codemirror/language-data";
import {oneDark} from "@codemirror/theme-one-dark";

import {closeBrackets, closeBracketsKeymap} from '@codemirror/autocomplete';
import {defaultKeymap, history, historyKeymap} from '@codemirror/commands';
import {highlightSelectionMatches, searchKeymap} from '@codemirror/search';
import {EditorState} from '@codemirror/state';
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

function createCodeMirror(targetElement: HTMLElement, initialText: string, themeType: "light" | "dark") {
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
        ])
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

export {createCodeMirror, EditorView};