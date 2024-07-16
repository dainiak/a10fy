import {extensionActions, RunInSandboxRequest, SandboxedTaskResult} from "../constants";

function playPython(code: string, outputElement: HTMLElement) {
    outputElement.style.setProperty("display", "");
    outputElement.innerHTML = '<div class="dot-pulse"></div><pre class="rounded-2 p-3 mb-0 hljs"><code class="hljs"></code></pre>';
    const codeResultElement = outputElement.querySelector("code") as HTMLElement;

    const sandbox = document.getElementById("sandbox") as HTMLIFrameElement;
    const requestId = (crypto.getRandomValues(new Uint32Array(1)).toString()).toString();

    const resultMessageHandler = (event: MessageEvent) => {
        if(event.data.action !== extensionActions.sandboxedTaskResultsUpdate || event.data.requestId !== requestId)
            return;
        const result = event.data as SandboxedTaskResult;
        codeResultElement.textContent = result.result.stdout;
        if (result.isFinal) {
            window.removeEventListener("message", resultMessageHandler);
            outputElement.querySelector(".dot-pulse")?.remove();
        }
    };
    window.addEventListener("message", resultMessageHandler);

    sandbox.contentWindow?.postMessage({
        action: extensionActions.runInSandbox,
        taskType: "python",
        taskParams: {
            code: code,
        },
        requestId: requestId
    } as RunInSandboxRequest, "*");
}



export {playPython};