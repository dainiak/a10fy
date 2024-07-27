import {themeType} from "../sidePanel/htmlElements";
import type vegaEmbed from "vega-embed";

export function playVegaLite(_: string, code: string, outputElement: HTMLElement, successCallback?: () => void, errorCallback?: (error: string) => void) {
    outputElement.className = "player-output rounded-2 p-3 mt-2 mb-0 hljs";
    outputElement.style.setProperty("display", "");
    outputElement.style.setProperty("text-align", "center");
    outputElement.innerHTML = "";

    ((window as any).vegaEmbed as typeof vegaEmbed)(outputElement, JSON.parse(code), {
        theme: themeType === "light" ? "ggplot2" : "dark",
        renderer: "svg",
        actions: {
            export: true,
            source: false,
            compiled: false,
            editor: false,
        }
    }).then(() => successCallback ? successCallback() : true).catch((e) => errorCallback ? errorCallback(e.toString()) : true);
}