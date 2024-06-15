const mediaRecorderOptions = {
    audioBitsPerSecond: 48000,
    // mimeType: "audio/ogg;codecs=opus"
};

let audioRecorder: MediaRecorder | null = null;
let mediaStream: MediaStream | null = null;

function startRecording(responseCallback?: CallableFunction) {
    if (!navigator.mediaDevices && responseCallback) {
        responseCallback({error: "Media devices not supported"});
    }
    else {
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            mediaStream = stream;
            audioRecorder?.stop();
            audioRecorder = new MediaRecorder(stream, mediaRecorderOptions);
            audioRecorder.start();
            responseCallback && responseCallback({message: "Recording started"});
        }).catch((err) => {
            console.error(`The following error occurred: ${err}`);
            mediaStream?.getTracks().forEach(track => track.readyState === 'live' && track.stop());
            responseCallback && responseCallback({error: err});
        });
    }
}

function stopRecording(responseCallback: CallableFunction | null) {
    if (audioRecorder) {
        audioRecorder.addEventListener("dataavailable", (blobEvent) => {
            const reader = new FileReader();
            reader.readAsDataURL(blobEvent.data);
            reader.addEventListener("loadend", () => {
                responseCallback && responseCallback(reader.result);
            });
        });
        audioRecorder.stop();
        mediaStream?.getTracks().forEach(track => track.readyState === 'live' && track.stop());
        mediaStream = null;
    }
    else {
        return {error: "No audio recording in progress"};
    }
}

export { startRecording, stopRecording };