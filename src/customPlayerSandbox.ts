import {
    CustomPlayerRequestParams, CustomPlayerResult,
    extensionMessageGoals,
    RunInSandboxRequest,
    SandboxedTaskResult
} from "./helpers/constants";
import {themeType} from "./helpers/sidePanel/htmlElements";

window.addEventListener('message', function (event) {
    if (event.data.messageGoal !== extensionMessageGoals.runInSandbox)
        return;

    const request = event.data as RunInSandboxRequest;

    if (request.taskType !== "custom")
        return;

    if(document.body)
        document.body.dataset.bsTheme = themeType;

    const params = request.taskParams as CustomPlayerRequestParams;
    (window as any).customCodePlayerParams = {language: params.language, code: params.code};
    (window as any).sendCustomCodePlayerResult = (result: CustomPlayerResult) => {
        event.source?.postMessage(
            {
                messageGoal: extensionMessageGoals.sandboxedTaskResultsUpdate,
                requestId: request.requestId,
                result: result
            } as SandboxedTaskResult, {
                targetOrigin: event.origin
            }
        );
    }

    if(params.customCSS) {
        const style = document.createElement('style');
        style.textContent = params.customCSS;
        document.head.appendChild(style);
    }
    if(params.customHTML) {
        document.body.innerHTML = params.customHTML;
    }
    if(params.customJS) {
        const script = document.createElement('script');
        script.textContent = params.customJS;
        document.head.appendChild(script);
    }
});