// create a class on top of ChatSession that is able to store messages, edit single message, serialize to json, and deserialize from json
class Chat {
    messages: Array<string>;

    constructor() {
        // super();
        this.messages = [];
    }
    appendMessage(message: string) {
        this.messages.push(message);
    }
    replaceMessage(index: number, newMessage: string) {
        this.messages[index] = newMessage;
    }
    serialize() {
        return JSON.stringify(this.messages);
    }
    deserialize(json: string) {
        this.messages = JSON.parse(json);
    }
}