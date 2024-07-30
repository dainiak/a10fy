import {extensionMessageGoals, RunInSandboxRequest, SandboxedTaskResult} from "../constants";
import {uniqueString} from "../misc";

export function playPython(_: string, code: string, outputElement: HTMLElement, successCallback?: () => void) {
    outputElement.style.setProperty("display", "");
    outputElement.innerHTML = '<div class="dot-pulse"></div><pre class="rounded-2 p-3 mb-0 hljs"><code class="hljs"></code></pre>';
    const codeResultElement = outputElement.querySelector("code") as HTMLElement;

    const sandbox = document.getElementById("sandbox") as HTMLIFrameElement;
    const requestId = uniqueString();

    const resultMessageHandler = (event: MessageEvent) => {
        if(event.data.action !== extensionMessageGoals.sandboxedTaskResultsUpdate || event.data.requestId !== requestId)
            return;
        const result = event.data as SandboxedTaskResult;
        codeResultElement.textContent = result.result.stdout;
        if (result.isFinal) {
            window.removeEventListener("message", resultMessageHandler);
            outputElement.querySelector(".dot-pulse")?.remove();
            if(successCallback)
                successCallback();
        }
    };
    window.addEventListener("message", resultMessageHandler);

    sandbox.contentWindow?.postMessage({
        messageGoal: extensionMessageGoals.runInSandbox,
        taskType: "python",
        taskParams: {
            code: code,
        },
        requestId: requestId
    } as RunInSandboxRequest, "*");
}