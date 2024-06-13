import {GoogleGenerativeAI} from "@google/generative-ai";
import {JSONParser} from "@streamparser/json";

function getJsonGeminiModel() {
    const GOOGLE_API_KEY = "AIzaSyD4YqBxteEa_aAR4wr1VEMNsMJJdnCkVXQ";
    const gemini = (new GoogleGenerativeAI(GOOGLE_API_KEY)).getGenerativeModel(
        {
            model: "gemini-1.5-flash"
        }
    );
    gemini.generationConfig.responseMimeType = "application/json";
    return gemini;
}

async function asyncRequestAndParse(requestData, jsonPaths, onValueCallback) {
    const parser = new JSONParser({stringBufferSize: undefined, paths: jsonPaths});
    parser.onValue = onValueCallback;

    const gemini = getJsonGeminiModel();
    const result = await gemini.generateContentStream(requestData);
    let completeText = "";

    for await (const chunk of result.stream) {
        const text = chunk.text();
        parser.write(text);
        completeText += text;
    }
    console.log(completeText);
}

export { asyncRequestAndParse };