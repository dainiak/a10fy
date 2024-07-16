import mermaid from "mermaid";
import {themeType} from "../sidePanel/htmlElements";
import {uniqueString} from "../uniqueId";

function playMermaid(code: string, outputElement: HTMLElement) {
    outputElement.className = "rounded-2 p-3 mb-0 hljs";
    outputElement.style.setProperty("display", "");
    outputElement.style.setProperty("text-align", "center");
    outputElement.innerHTML = "";
    const tempElement = document.createElement("div");
    outputElement.appendChild(tempElement);
    tempElement.id = `mermaid-${uniqueString()}`;
    mermaid.initialize({
        startOnLoad: false,
        // suppressErrorRendering: true, – likely to be available in the next Mermaid version
        securityLevel: 'loose',
        theme: themeType === "light" ? "default" : "dark",
    });

    if(!mermaid.parse(code, { suppressErrors: true }))
        return;
    mermaid.render(tempElement.id, code).then((renderResult) => {
        outputElement.innerHTML = renderResult.svg;
    }).catch((e) => {
        outputElement.textContent = `Failed to render the diagram: ${e}`;
    });
}

export {playMermaid};