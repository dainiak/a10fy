import {loadPyodide, version as pyodideVersion} from "pyodide";
import {extensionMessageGoals, RunInSandboxRequest, SandboxedTaskResult} from "./helpers/constants";

window.addEventListener('message', function (event) {
    if (event.data.messageGoal !== extensionMessageGoals.runInSandbox)
        return;

    const request = event.data as RunInSandboxRequest;

    if (request.taskType !== "python")
        return;

    const sendUpdateMessage = (result: any, isFinal: boolean = false) => {
        event.source?.postMessage(
            {
                messageGoal: extensionMessageGoals.sandboxedTaskResultsUpdate,
                requestId: request.requestId,
                result: result,
                isFinal: isFinal
            } as SandboxedTaskResult, {
                targetOrigin: event.origin
            }
        );
    }
    sendUpdateMessage({stdout: `Loading Python 3.12.1 interpreter (Pyodide ${pyodideVersion})...`})

    loadPyodide({
        stdout: (text) => {sendUpdateMessage({stdout: text})},
        stderr: (text) => {sendUpdateMessage({stderr: text})},
        fullStdLib: false
    }).then((pyodide) => {
        try {
            const result = pyodide.runPython(request.taskParams.code);
            if(result !== undefined && result !== null && result !== "") {
                let textContent = result.toString();
                if(result.destroy)
                    result.destroy();
                sendUpdateMessage({stdout: textContent}, true);
            }
            else
                sendUpdateMessage({}, true);
        } catch (e) {
            const textContent = `\n${e}`;
            sendUpdateMessage({stdout: textContent}, true);
        }
    }).catch((e) => {
        sendUpdateMessage({stderr: `failed due to error:\n${e}`}, true);
    });
});