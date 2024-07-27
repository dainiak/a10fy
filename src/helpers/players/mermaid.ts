import {themeType} from "../sidePanel/htmlElements";
import {uniqueString} from "../uniqueId";
import {type Mermaid} from "mermaid";

const mermaid: Mermaid = (window as any).mermaid;

export function playMermaid(_: string, code: string, outputElement: HTMLElement, successCallback?: () => void, errorCallback?: (error: string) => void) {
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
        legacyMathML: true, // render using KaTeX
        theme: themeType === "light" ? "default" : "dark",
    });

    mermaid.parse(code, { suppressErrors: false }).then(() => {
        mermaid.render(tempElement.id, code).then((renderResult) => {
            outputElement.innerHTML = renderResult.svg;
            (outputElement.querySelector("svg") as SVGElement)?.removeAttribute("id");
            tempElement.remove();
            document.getElementById(tempElement.id)?.remove();
            document.getElementById("d" + tempElement.id)?.remove();
            if(successCallback)
                successCallback();
        }).catch((e) => {
            outputElement.textContent = `Failed to render the diagram: ${e}`;
            tempElement.remove();
            document.getElementById(tempElement.id)?.remove();
            document.getElementById("d" + tempElement.id)?.remove();
            if(errorCallback)
                errorCallback(e);
        });
    }).catch((e) => {
        outputElement.textContent = `Failed to render the diagram: ${e}`;
        tempElement.remove();
        document.getElementById(tempElement.id)?.remove();
        document.getElementById("d" + tempElement.id)?.remove();
        if(errorCallback)
            errorCallback(e);
    });
}