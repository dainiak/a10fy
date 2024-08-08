importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js");

self.onmessage = async (event) => {
    const { taskParams, requestId } = event.data;
    const code = taskParams.code;
    const sendUpdateMessage = (result, isFinal) => self.postMessage({
        messageGoal: "sandboxedTaskResultsUpdate",
        requestId: requestId,
        result: result,
        isFinal: isFinal || false
    });

    try {
        sendUpdateMessage({stdout: `Loading Python 3.12.1 interpreter (Pyodide)...`});
        const pyodide = await loadPyodide({
            stdout: (s) => sendUpdateMessage({stdout: s}),
            stderr: (s) => sendUpdateMessage({stderr: s}),
        });
        sendUpdateMessage({stdout: `Loading imported packages...`});
        await pyodide.loadPackagesFromImports(code);

        const result = await pyodide.runPython(code);
        sendUpdateMessage({stdout: result}, true);
    } catch (error) {
        sendUpdateMessage({stderr: error.message}, true);
    }
};