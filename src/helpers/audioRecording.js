let audioRecorder = null;
let mediaStream = null;

function startRecording(responseCallback) {
    if (!navigator.mediaDevices) {
        responseCallback({error: "Media devices not supported"});
    }
    else {
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            mediaStream = stream;
            audioRecorder?.stop();
            audioRecorder = new MediaRecorder(stream);
            audioRecorder.start();
            responseCallback({message: "Recording started"});
        }).catch((err) => {
            console.error(`The following error occurred: ${err}`);
            mediaStream?.getTracks().forEach(track => track.readyState === 'live' && track.stop());
            responseCallback({error: err});
        });
    }
}

function stopRecording(responseCallback) {
    if (audioRecorder) {
        audioRecorder.addEventListener("dataavailable", (blobEvent) => {
            const reader = new FileReader();
            reader.readAsDataURL(blobEvent.data);
            reader.addEventListener("loadend", () => {
                responseCallback(reader.result);
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