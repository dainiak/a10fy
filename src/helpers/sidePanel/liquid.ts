import {Liquid} from "liquidjs";
import {FilterHandler} from "liquidjs/dist/template/filter-impl-options";

const liquidFilters: {name: string, fn: FilterHandler, description: string, usageExamples: {input: string, output: string}[]}[] = [
    {
        name: 'regexp_split',
        fn: (str: string, pattern: string, flags?: string) => flags ? str.split(RegExp(pattern, flags)) : str.split(RegExp(pattern)),
        description: 'Split a string using a regular expression pattern.',
        usageExamples: [{
            input: '{{ "one+--+two-+-three" | regexp_split: "[-+]+", "g" }}',
            output: '["one", "two", "three"]'
        }]
    },
    {
        name: 'regexp_match',
        fn: (str: string, pattern: string, flags?: string) => flags ? str.match(RegExp(pattern, flags)) : str.match(RegExp(pattern)),
        description: 'Match a string using a regular expression pattern.',
        usageExamples: [{
            input: '{{ "one+--+two-+-three" | regexp_match: "[-+]+", "g" }}',
            output: '["+--", "-+", "+-"]'
        }]
    },
    {
        name: 'regexp_replace',
        fn: (str: string, pattern: string, flags: string, replacement: string) => str.replace(RegExp(pattern, flags), replacement),
        description: 'Replace a string using a regular expression pattern.',
        usageExamples: [{
            input: '{{ "one+--+two-+-three" | regexp_replace: "[-+]+", "g", " " }}',
            output: '"one two three"'
        }]
    },
    {
        name: 'as_dom_node',
        fn: (s: string) => (new DOMParser()).parseFromString(s, "text/html").body.firstChild,
        description: 'Convert a string to a DOM node.',
        usageExamples: [{
            input: '{{ "<div>Hello World</div>" | as_dom_node }}',
            output: '<div>Hello World</div>'
        }]
    },
    {
        name: 'query_selector',
        fn: (node: HTMLElement, selector: string) => node.querySelector(selector),
        description: 'Query a DOM node using a CSS selector.',
        usageExamples: [{
            input: '{{ "<div><span><a href="#">Hi</a></span> there!</div>" | as_dom_node | query_selector: "span" }}',
            output: '<span><a href="#">Hi</a></span>'
        }]
    },
    {
        name: 'query_selector_all',
        fn: (node: HTMLElement, selector: string) => node.querySelectorAll(selector),
        description: 'Query all DOM nodes using a CSS selector.',
        usageExamples: [{
            input: '{{ some_dom_node | query_selector_all: "div.c" }}',
            output: '[<div class="c">...</div>, <div class="c">...</div>, ...]'
        }]
    },
    {
        name: 'inner_text',
        fn: (node: HTMLElement) => node.innerText,
        description: 'Get the innerText of a DOM node.',
        usageExamples: []
    },
    {
        name: 'text_content',
        fn: (node: Node) => node.textContent,
        description: 'Get the textContent of a DOM node.',
        usageExamples: []
    },
    {
        name: 'inner_html',
        fn: (node: HTMLElement) => node.innerHTML,
        description: 'Get the innerHTML of a DOM node.',
        usageExamples: [{
            input: '{{ "<div><span><a href="#">Hi</a></span> there!</div>" | as_dom_node | query_selector: "span" | inner_html }}',
            output: '"<a href="#">Hi</a>"'
        }]
    },
    {
        name: 'outer_html',
        fn: (node: HTMLElement) => node.outerHTML,
        description: 'Get the outerHTML of a DOM node.',
        usageExamples: [{
            input: '{{ "<div><span>Hi</span> there!</div>" | as_dom_node | query_selector: "span" | outer_html }}',
            output: '"<span>Hi</span>"'
        }]
    }
];

const liquidEngine = new Liquid();
for (const filter of liquidFilters) {
    liquidEngine.registerFilter(filter.name, filter.fn);
}

export {liquidEngine, liquidFilters};