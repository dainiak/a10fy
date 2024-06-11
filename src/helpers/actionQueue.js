function getActionQueue() {
    let stack1 = [];
    let stack2 = [];
    return {
        isEmpty: () => stack1.length === 0 && stack2.length === 0,
        clear: () => {
            stack1 = [];
            stack2 = [];
        },
        enqueue: (value) => Array.isArray(value) ? stack1.push(...value) : stack1.push(value),
        executeNext: () => {
            if (stack2.length === 0){
                if (stack1.length === 0)
                    return;
                stack2 = stack1.reverse();
                stack1 = [];
            }
            return stack2.pop()();
        }
    }
}

export default getActionQueue;