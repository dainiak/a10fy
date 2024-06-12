const audioBuffer = [];
let audioRecorder = null;

function startRecording(responseCallback) {
    if (!navigator.mediaDevices) {
        responseCallback({error: "Media devices not supported"});
    }
    else {
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            audioRecorder = new MediaRecorder(stream);
            audioRecorder.ondataavailable = (e) => {
                audioBuffer.push(e.data);
            };

            audioBuffer.length = 0;
            audioRecorder.start();
            responseCallback({message: "Recording started"});
            //TODO: remove this automatic stop
            setTimeout(audioRecorder.stop, 3000);
        })
            .catch((err) => {
                console.error(`The following error occurred: ${err}`);
                responseCallback({error: err});
            });
    }
}

function stopRecording() {
    if (audioRecorder) {
        audioRecorder.stop();
        return {audio: URL.createObjectURL(new Blob(audioBuffer, { type: "audio/ogg; codecs=opus" }))};
    }
    else {
        return {error: "No audio recording in progress"};
    }
}

export { startRecording, stopRecording };