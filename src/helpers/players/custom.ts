import {uniqueString} from "../uniqueId";
import {
    CustomPlayerRequestParams,
    CustomPlayerResult,
    extensionMessageGoals,
    RunInSandboxRequest
} from "../constants";

export function customPlayerFactory(customCSS: string, customJS: string, customHTML: string, callback?: Function) {
    return (language: string, code: string, outputElement: HTMLElement) => {
        outputElement.style.setProperty("display", "");
        const requestId = uniqueString();
        const sandbox = document.createElement("iframe") as HTMLIFrameElement;
        sandbox.id = requestId;
        sandbox.src = "customPlayerSandbox.html";
        sandbox.classList.add("object-fit-fill");
        sandbox.classList.add("mx-0");
        sandbox.classList.add("my-0");
        sandbox.classList.add("px-0");
        sandbox.classList.add("py-0");
        sandbox.width = outputElement.getBoundingClientRect().width.toString();
        sandbox.height = "1";
        outputElement.appendChild(sandbox);

        const resultMessageHandler = (event: MessageEvent) => {
            if (event.data.action !== extensionMessageGoals.sandboxedTaskResultsUpdate || event.data.requestId !== requestId)
                return;
            window.removeEventListener("message", resultMessageHandler);
            try {
                const result = (event.data.result as CustomPlayerResult);
                if (result.html) {
                    outputElement.innerHTML = result.html;
                } else {
                    Array.from(outputElement.children).forEach((child) => {
                        if(child.id !== requestId)
                            child.remove();
                    });
                }
                if (result.width) {
                    sandbox.width = result.width.toString();
                }
                if (result.height) {
                    sandbox.height = result.height.toString();
                }
                if(callback)
                    callback(result);
            }
            catch(e) {
                outputElement.innerHTML = `An error occurred while running the player: ${e}`;
            }
        };
        window.addEventListener("message", resultMessageHandler);

        const params: CustomPlayerRequestParams = {
            code: code,
            language: language,
            customCSS: customCSS,
            customHTML: customHTML,
            customJS: customJS
        }
        sandbox.onload = () => {
            sandbox.contentWindow?.postMessage({
                messageGoal: extensionMessageGoals.runInSandbox,
                taskType: "custom",
                taskParams: params,
                requestId: requestId
            } as RunInSandboxRequest, "*");
        }
    }
}