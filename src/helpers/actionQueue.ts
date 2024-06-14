type Action = () => void;

class ActionQueue {
    private stack1: Action[] = [];
    private stack2: Action[] = [];

    isEmpty(): boolean {
        return this.stack1.length === 0 && this.stack2.length === 0;
    }

    clear(): void {
        this.stack1 = [];
        this.stack2 = [];
    }

    enqueue(value: Action | Action[]): void {
        if (Array.isArray(value))
            this.stack1.push(...value);
        else
            this.stack1.push(value);
    }

    executeNext(): void | undefined {
        if (this.stack2.length === 0) {
            if (this.stack1.length === 0) {
                return;
            }
            this.stack2 = this.stack1.reverse();
            this.stack1 = [];
        }
        const nextAction = this.stack2.pop();
        if (nextAction)
            nextAction();
    }
}

export default ActionQueue;