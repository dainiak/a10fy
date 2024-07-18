import {themeType} from "../sidePanel/htmlElements";

function playVegaLite(_: string, code: string, outputElement: HTMLElement) {
    outputElement.className = "player-output rounded-2 p-3 mt-2 mb-0 hljs";
    outputElement.style.setProperty("display", "");
    outputElement.style.setProperty("text-align", "center");
    outputElement.innerHTML = "";
    // @ts-ignore
    window.vegaEmbed(outputElement, JSON.parse(code), {
        theme: themeType === "light" ? "ggplot2" : "dark",
        renderer: "svg",
        actions: {
            export: true,
            source: false,
            compiled: false,
            editor: false,
        }
    });
}

export {playVegaLite};
