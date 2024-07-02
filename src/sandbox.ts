import {loadPyodide, version as pyodideVersion} from "pyodide";
import {extensionActions} from "./helpers/constants";

window.addEventListener('message', function (event) {
    if (event.data.action !== extensionActions.runSandboxedPythonCode)
        return;

    const codeToRun = event.data.codeToRun;

    let textContent = `Loading Python 3.12.1 interpreter (Pyodide ${pyodideVersion})...`;
    const sendUpdateMessage = (content: string, isFinal: boolean = false) => {
        event.source?.postMessage(
            {
                action: extensionActions.updateSandboxedPythonCodeOutput,
                requestId: event.data.requestId,
                stdout: content,
                isFinal: isFinal
            }, {
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
            const result = pyodide.runPython(codeToRun);
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