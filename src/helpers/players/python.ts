import {extensionMessageGoals, RunInSandboxRequest, SandboxedTaskResult} from "../constants";
import {isRunningAsExtension, uniqueString} from "../misc";

let postMessage: (message: any) => void = () => {};

if(isRunningAsExtension()) {
    const sandbox = document.getElementById("sandbox") as HTMLIFrameElement;
    postMessage = (message: any) => {
        sandbox.contentWindow?.postMessage(message, "*");
    };
} else {
    const pyodideWorker = new Worker("js/pyodideWorker.js");
    pyodideWorker.onmessage = (event) => {
        window.postMessage(event.data, "*");
    }
    postMessage = (message) => pyodideWorker.postMessage(message);
}

export function playPython(_: string, code: string, outputElement: HTMLElement, successCallback?: () => void) {
    outputElement.style.setProperty("display", "");
    outputElement.innerHTML = '<div class="dot-pulse"></div><pre class="rounded-2 p-3 mb-0 hljs"><code class="hljs"></code></pre>';
    const codeResultElement = outputElement.querySelector("code") as HTMLElement;

    const requestId = uniqueString();

    const resultMessageHandler = (event: MessageEvent) => {
        if(event.data.messageGoal !== extensionMessageGoals.sandboxedTaskResultsUpdate || event.data.requestId !== requestId)
            return;
        const result = event.data as SandboxedTaskResult;
        if(result.result.stdout !== undefined)
            codeResultElement.textContent += result.result.stdout + "\n";
        if(result.result.stderr !== undefined)
            codeResultElement.textContent += result.result.stderr + "\n";

        if (result.isFinal) {
            codeResultElement.textContent = (codeResultElement.textContent || "").trim();
            window.removeEventListener("message", resultMessageHandler);
            outputElement.querySelector(".dot-pulse")?.remove();
            if(successCallback)
                successCallback();
        }
    };
    window.addEventListener("message", resultMessageHandler);

    postMessage({
        messageGoal: extensionMessageGoals.runInSandbox,
        taskType: "python",
        taskParams: {
            code: code,
        },
        requestId: requestId
    } as RunInSandboxRequest);
}