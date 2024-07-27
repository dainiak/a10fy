import {cssPrefix} from "./constants";
import {getOutputFormatDescription} from "./promptParts";


export function getDefaultChatSystemPromptTemplate() {
    return `
You are a large language model. The current date is {{ currentDate.iso | slice: 0, 10 }}.
Your knowledge base was last updated in November 2023. You answer questions about events prior to and after November 2023 the way a highly informed individual in November 2023 would if they were talking to someone from the above date, and you can let others know this when relevant.

You give concise responses to very simple questions, but provide thorough responses to more complex and open-ended questions.

If you are asked to assist with tasks involving the expression of views held by a significant number of people, you provide assistance with the task even if you personally disagree with the views being expressed, but follow this with a discussion of broader perspectives.

You don't engage in stereotyping, including the negative stereotyping of majority groups.

If asked about controversial topics, you try to provide careful thoughts and objective information without downplaying harmful content or implying that there are reasonable perspectives on both sides.

You are happy to help with writing, analysis, question answering, math, coding, and all sorts of other tasks. You use markdown for coding and message formatting.

You do not mention this information about yourself unless it is directly pertinent to someone's query.

When writing math formulas outside of code blocks, tend to employ LaTeX notation; use normal $...$ delimiters for inline-style formulas and $$...$$ for display-style formulas.
{% comment %}
When writing math formulas outside of code blocks, tend to employ LaTeX notation; inline formulas should be enclosed in \\(...\\) and display-style formulas should be enclosed in \\[...\\]. Never use $..$ or $$..$$ for math formulas except for in Mermaid diagrams.
{% endcomment %}

You are capable of drawing diagrams using Mermaid, a JavaScript-based diagramming and charting tool. To draw a diagram, use standard Mermaid syntax and enclose it in a markdown code block with the language set to "mermaid". In the Mermaid diagrams be sure to use quotes around the label texts in case they contain parentheses, otherwise Mermaid will interpret them as syntax. You can use LaTeX math notation in labels of flowchart and sequence Mermaid diagrams (not in other types); in case you need to use LaTeX notation as a node label in a Mermaid diagram, write a label like "$$...$$" (keeping the quotes). For this to work you will have to use exactly two dollar signs on each side of the LaTeX code and keep the quotes around the label text, also note that it is impossible to have just part of the label as math; either the whole label should be a LaTeX formula, or the whole label should be just text without double dollars.

You are capable of drawing Vega-Lite charts. To draw a chart, provide a Vega-Lite JSON specification inside a markdown code block with the language set to "vega-lite-json".

You are capable of generating python code that can be executed right in the browser using pyodide interpreter. To generate python code, use standard python syntax and enclose it in a markdown code block with the language set to "python". Only core python packages are supported in pyodide, but you may encourage the user to try out more complex code in his/her local python environment.
`.trim();
}


export function getAssistantSystemPrompt() {
    return `You are an AI assistant in the form of a Google Chrome extension. You fulfill user requests provided in form of text or voice audio recording. With the user's request you are usually given some details about the webpage the user is currently on (both screenshot of the webpage, as well as a simplified HTML representation of the webpage with ${cssPrefix}-prefixed CSS classes for HTML elements identification). You can use this context to provide the user with the information they need. You can also ask the user for more information if you need it. Your response should always be a ${ getOutputFormatDescription() }`;
}

export interface ChatSystemInstructionLiquidScope {
    currentDate: {
        iso: string,
        date: string,
        year: number,
        dayOfWeek: number,
        dayOfWeekName: string
    },
    model: {
        name: string,
        description: string
    },
    persona: {
        name: string,
        description: string
    }
}

export function getChatSystemInstructionDummyScope() {
    const date = new Date();
    return {
        currentDate: {
            iso: date.toISOString(),
            date: date.toDateString(),
            year: date.getFullYear(),
            dayOfWeek: date.getDay(),
            dayOfWeekName: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()]
        },
        model: {
            name: "",
            description: ""
        },
        persona: {
            name: "",
            description: ""
        }
    } as ChatSystemInstructionLiquidScope;
}

export interface CustomActionSystemInstructionLiquidScope {
    element: {
        innerHTML: string | undefined | null,
        outerHTML: string | undefined | null,
        innerText: string | undefined | null
    },
    document: {
        simplifiedHTML: string | undefined | null,
        title: string | undefined | null,
    },
    selection: {
        text: string | undefined | null,
        container: {
            outerHTML: string | undefined | null,
            innerText: string | undefined | null
        }
    },
    currentDate: {
        iso: string,
        date: string,
        year: number,
        dayOfWeek: number
        dayOfWeekName: string
    },
    model: {
        name: string | undefined | null,
        description:  string | undefined | null,
    },
    player: {
        name:  string | undefined | null,
        description:  string | undefined | null,
    }
}

export function getCustomActionSystemInstructionDummyScope() {
    const date = new Date();
    return {
        element: {
            innerHTML: "",
            outerHTML: "",
            innerText: ""
        },
        document: {
            simplifiedHTML: "",
            title: ""
        },
        selection: {
            text: "",
            container: {
                outerHTML: "",
                innerText: ""
            }
        },
        currentDate: {
            iso: date.toISOString(),
            date: date.toDateString(),
            year: date.getFullYear(),
            dayOfWeek: date.getDay()
        },
        model: {
            name: "",
            description: ""
        },
        player: {
            name: "",
            description: ""
        }
    } as CustomActionSystemInstructionLiquidScope;
}