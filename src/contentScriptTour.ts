import {TourGuideClient} from "@sjmc11/tourguidejs";

function executeTour() {
    const client = new TourGuideClient();

    const steps = [
        {
            title: "Welcome aboard 👋",
            content: "This is a short guide to get you set up and show you where things are",
            target: "",
            order: 1
        }
    ];

    for(const step of steps) {
        client.addSteps([
            {
                title: step.title,
                content: step.content,
                target: step.target ? (document.querySelector(step.target) as HTMLElement) : undefined,
                order: step.order
            }
        ]);
    }

    client.start();
}

executeTour();