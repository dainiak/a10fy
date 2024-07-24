import {loadPyodide, version as pyodideVersion} from "pyodide";
import {extensionMessageGoals, RunInSandboxRequest, SandboxedTaskResult} from "./helpers/constants";

window.addEventListener('message', function (event) {
    if (event.data.action !== extensionMessageGoals.runInSandbox)
        return;

    const request = event.data as RunInSandboxRequest;

    if (request.taskType !== "python")
        return;

    let textContent = `Loading Python 3.12.1 interpreter (Pyodide ${pyodideVersion})...`;
    const sendUpdateMessage = (content: string, isFinal: boolean = false) => {
        event.source?.postMessage(
            {
                messageGoal: extensionMessageGoals.sandboxedTaskResultsUpdate,
                requestId: request.requestId,
                result: {
                    stdout: content,
                },
                isFinal: isFinal
            } as SandboxedTaskResult, {
                targetOrigin: event.origin
            }
        );
    }

    loadPyodide({
        stdout: (text) => {
            textContent += text + "\n";
            sendUpdateMessage(textContent);
        },
        stderr: (text) => {
            textContent += text + "\n";
            sendUpdateMessage(textContent);
        }
    }).then((pyodide) => {
        textContent += "done.\n";
        try {
            const result = pyodide.runPython(request.taskParams.code);
            if(result !== undefined && result !== null && result !== "") {
                textContent += result.toString();
                if(result.destroy)
                    result.destroy();
            }
            sendUpdateMessage(textContent, true);
        } catch (e) {
            if (textContent)
                textContent += `\n${e}`;
            sendUpdateMessage(textContent, true);
        }
    }).catch((e) => {
        textContent += `failed due to error:\n${e}`;
        sendUpdateMessage(textContent, true);
    });


});