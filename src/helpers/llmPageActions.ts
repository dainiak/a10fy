import {TourGuideClient} from "@sjmc11/tourguidejs";
import {findElementByIndex} from "./domManipulation";
import {tourGuideStyleContent} from "./styleStrings";
import ActionQueue from "./actionQueue";
import {ActionRequest} from "./constants";


const llmPageActionNames = {
    click: "click",
    focus: "focus",
    scrollIntoView: "scrollIntoView",
    submit: "submit",
    setValue: "setValue",
    clearInput: "clearInput",
    typeString: "typeString",
    setText: "setText",
    remove: "remove",
    hide: "hide",
    setStyle: "setStyle",
    setHTML: "setHTML",
    setAttribute: "setAttribute",
    removeAttribute: "removeAttribute",
    pressEnter: "pressEnter",
    searchForm: "searchForm",
    navigate: "navigate",
    pageTourStart: "pageTourStart",
    pageTourStep: "pageTourStep",
}


interface LLMPageAction {
    description: string;
    atomicActions: (element: Node | null, actionParams?: any) => (() => void)[];
}

interface LLMPageActions {
    [key: string]: LLMPageAction;
}


function getStringTypingSimulationSequence(element: Node, s: string) {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement))
        return [];
    const atomicActions = [() => element.focus()];

    for (const char of s) {
        const charData = {
            key: char,
            code: `Key${char.toUpperCase()}`,
            keyCode: char.codePointAt(0),
            charCode: char.codePointAt(0),
            bubbles: true
        };

        atomicActions.push(() => {
            const activeElement = document.activeElement;
            activeElement?.dispatchEvent(new KeyboardEvent('keydown', charData));
            activeElement?.dispatchEvent(new KeyboardEvent('keypress', charData));
            if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement)
                activeElement.value += char;
            activeElement?.dispatchEvent(new Event('input', {bubbles: true}));
            activeElement?.dispatchEvent(new KeyboardEvent('keyup', charData));
            activeElement?.dispatchEvent(new Event('change', {bubbles: true}));
        });
    }

    return atomicActions;
}

function pressEnter(element: Node | null) {
    element && element.dispatchEvent(new KeyboardEvent(
        'keydown', {key: "Enter", code: "Enter", keyCode: 13, charCode: 13, bubbles: true}
    ))
}

const llmPageActions: LLMPageActions = {
    [llmPageActionNames.click]: {
        description: "Call the click() method on a DOM element. Avoid using this command to submit forms. Use submit or pressEnter commands instead.",
        atomicActions: (element) => [() => element instanceof HTMLElement && element.click()]
    },
    [llmPageActionNames.focus]: {
        description: "Call the focus() method on a DOM element.",
        atomicActions: (element) => [() => element instanceof HTMLElement && element.focus()]
    },
    [llmPageActionNames.scrollIntoView]: {
        description: "Call the scrollIntoView() method on a DOM element.",
        atomicActions: (element) => [() => element instanceof HTMLElement && element.scrollIntoView()]
    },
    [llmPageActionNames.submit]: {
        description: "Call the submit() method on a form DOM element. This command is also valid when the element is a button or input element inside a form element. In this case, the form element containing the button or input element will be submitted. For search forms, prefer using this command instead of clicking the search button/icon if there is any.",
        atomicActions: (element) => [() => {
            if (element instanceof HTMLFormElement)
                element.submit();
            else if (element instanceof HTMLElement) {
                const form = element.querySelector("form");
                if (form)
                    form.submit();
                for (let parent = element.parentElement; parent; parent = parent.parentElement)
                    if (parent instanceof HTMLFormElement) {
                        parent.submit();
                        break;
                    }
            }
        }]
    },
    [llmPageActionNames.setValue]: {
        description: "Set the 'value' attribute of a DOM element to a given string (actionParams is a string).",
        atomicActions: (element, value) => [() => {
            if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement))
                return;
            element.value = value;
            element.dispatchEvent(new Event('input', {bubbles: true}));
            element.dispatchEvent(new Event('change', {bubbles: true}));
        }]
    },
    [llmPageActionNames.clearInput]: {
        description: "Clear the value of an input/textarea DOM element.",
        atomicActions: (element) => [() => {
            if(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                element.value = "";
                element.dispatchEvent(new Event('input', {bubbles: true}));
                element.dispatchEvent(new Event('change', {bubbles: true}));
            }
        }]
    },
    [llmPageActionNames.typeString]: {
        description: "Simulate typing the provided string value into the DOM element character-by-character (actionParams is a string).",
        atomicActions: (element, value) => element ? getStringTypingSimulationSequence(element, value) : []
    },
    [llmPageActionNames.setText]: {
        description: "Set the textContent of the element to the provided value (actionParams is a string).",
        atomicActions: (element, value) => element ? [() => element.textContent = value] : []
    },
    [llmPageActionNames.setHTML] : {
        description: "Set the innerHTML of the element to the provided value (actionParams is a string).",
        atomicActions: (element, value) => [() => (element as HTMLElement).innerHTML = value]
    },
    [llmPageActionNames.remove]: {
        description: "Remove the element from DOM.",
        atomicActions: (element) => [() => element instanceof HTMLElement && element.remove()]
    },
    [llmPageActionNames.hide]: {
        description: 'Hide the element by setting style as "display: none".',
        atomicActions: (element) => [() => element instanceof HTMLElement && element.style.setProperty("display", "none")]
    },
    [llmPageActionNames.setStyle]: {
        description: "Modify the CSS style attribute of the element according to the provided actionParams. If actionParams is an object, set each key-value pair as a style property. If actionParams is a string, set the complete style attribute equal to the provided string.",
        atomicActions: (element, value) => {
            if (typeof value === "object")
                return [() => {
                    for (let attr in value) element instanceof HTMLElement && element.style.setProperty(attr, value[attr])
                }]
            return [() => element instanceof HTMLElement && element.setAttribute("style", value)]
        }
    },
    [llmPageActionNames.setAttribute]: {
        description: "Set the attribute of the element to the provided value. The actionParams is an object whose key-value pairs correspond to the attribute names and values to be set. Do not use this command to set the 'value' of HTML input elements. Use setValue instead.",
        atomicActions: (element, value) => [() => {
            for (let attr in value) element instanceof HTMLElement && element.setAttribute(attr, value[attr])
        }]
    },
    [llmPageActionNames.removeAttribute]: {
        description: "Remove the attribute from the element. The actionParams is the attribute name.",
        atomicActions: (element, attribute) => [() => element instanceof HTMLElement && element.removeAttribute(attribute)]
    },
    [llmPageActionNames.pressEnter]: {
        description: "Simulate pressing the Enter key on the element. You can use this command to try submit forms if there is no other obvious way to do it.",
        atomicActions: (element) => [() => pressEnter(element)]
    },
    [llmPageActionNames.searchForm]: {
        description: "Search for the provided query in the search form of a webpage. The element for this command is the form's input field. The actionParams is the query string to be searched.",
        atomicActions: (element, query) => [
            () => {if (element instanceof HTMLInputElement) element.value = ""},
            () => {
                element && element.dispatchEvent(new Event('input', {bubbles: true}));
                element && element.dispatchEvent(new Event('change', {bubbles: true}));
            },
            ...(element ? getStringTypingSimulationSequence(element, query) : []),
            () => pressEnter(document.activeElement)
        ]
    },
    [llmPageActionNames.navigate]: {
        description: "Navigate to the provided URL. The actionParams is a string which is either the URL to navigate to, or \"back\" to navigate to the previous page in the browser history, or \"forward\" to navigate to the next page in the browser history, or \"reload\" to reload the current page.",
        atomicActions: (_, url) => {
            if (url === "back")
                return [() => window.history.back()];
            if (url === "forward")
                return [() => window.history.forward()];
            if (url === "reload")
                return [() => window.location.reload()];
            return [() => window.location = url];
        }
    },
    [llmPageActionNames.pageTourStart]: {
        description: "Start a guided tour around the page. The actionParams is an object with two keys: stepTitle which is a string containing the title of the first tour step, and stepText which is a non-empty string with the message shown to the user in the first tour step. The elementIndex is the index of the element to highlight in the first step of the tour; if elementIndex is null then the step message is shown globally centered on the page. Typically elementIndex values are non-null except for the first step of the tour. Every subsequent step in the tour is defined by a separate pageTourStep action. There should be no more than one pageTourStart action in the actionList; and immediately after the pageTourStart there should be zero or more pageTourStep actions.",
        atomicActions: (element, actionParams) => {
            const styleId = "a10fyTourGuideStylesheet";
            if (!document.getElementById(styleId)) {
                const style = document.createElement("style");
                style.id = styleId;
                style.textContent = tourGuideStyleContent;
                document.head.appendChild(style);
            }

            if (!actionParams || !actionParams.stepText)
                return [];

            return [() => {
                // @ts-ignore
                window.tourGuideClient = new TourGuideClient({steps: [{
                    title: actionParams.stepTitle,
                    content: actionParams.stepText,
                    target: element ? element as HTMLElement : undefined
                }]});
                // @ts-ignore
                tourGuideClient.start();
            }]
        }
    },
    [llmPageActionNames.pageTourStep]: {
        description: "Add yet another step into an on-going guided tour around the page. The actionParams is an object with two keys: stepTitle which is a string containing the title of the step, and stepText which is a non-empty string with the message shown to the user in the step. The elementIndex is the index of the element to highlight in the current step of the tour; if elementIndex is null then the step message is shown globally centered on the page. Typically elementIndex values are non-null except for the first step of the tour. The pageTourStep action should follow either pageTourStart or another pageTourStep action.",
        atomicActions: (element, actionParams) => {
            if (!actionParams || !actionParams.stepText)
                return [];

            return [() => {
                // @ts-ignore
                window.tourGuideClient.addSteps([{
                    title: actionParams.stepTitle,
                    content: actionParams.stepText,
                    target: element ? element as HTMLElement : undefined
                }]);
                // @ts-ignore
                tourGuideClient.refreshDialog();
            }]
        }
    }
}


function enqueuePageAction(actionQueue: ActionQueue, action: ActionRequest) {
    const {actionName, elementIndex, actionParams} = action;
    const element = findElementByIndex(elementIndex);

    if (llmPageActions.hasOwnProperty(actionName)) {
        actionQueue.enqueue(llmPageActions[actionName].atomicActions(element, actionParams));
    } else {
        console.log(`Action ${actionName} not found`)
    }
}


export {llmPageActions, LLMPageAction, llmPageActionNames, enqueuePageAction};