const mediaRecorderOptions = {
    audioBitsPerSecond: 48000,
    // mimeType: "audio/ogg;codecs=opus"
};

let audioRecorder: MediaRecorder | null = null;
let mediaStream: MediaStream | null = null;
let audioResultSuccessHandler: Function | null = null;
let audioResultErrorHandler: Function | null = null;


export function recordAudio() {
    if (audioResultErrorHandler) {
        audioResultErrorHandler("New audio recording requested");
    }

    return new Promise((resolve, reject) => {
        audioResultSuccessHandler = resolve;
        audioResultErrorHandler = reject;

        if (!navigator.mediaDevices) {
            reject("Media devices not supported");
        }
        else {
            navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
                try {
                    mediaStream = stream;
                    audioRecorder?.stop();
                    audioRecorder = new MediaRecorder(stream, mediaRecorderOptions);
                    audioRecorder.start();
                }
                catch (err) {
                    reject(err);
                }
            }).catch((err) => {
                try {
                    mediaStream?.getTracks().forEach(track => track.readyState === 'live' && track.stop());
                    reject(err);
                }
                catch (err) {
                    reject(err);
                }
            });
        }
    })
}

export function stopRecording() {
    if (!audioRecorder)
        return false;

    audioRecorder.ondataavailable = (blobEvent) => {
        const reader = new FileReader();
        reader.readAsDataURL(blobEvent.data);
        reader.onloadend = () => {
            audioResultSuccessHandler && audioResultSuccessHandler(reader.result);
            audioResultSuccessHandler = null;
            audioResultErrorHandler = null;
        };
        reader.onerror = () => {
            audioResultErrorHandler && audioResultErrorHandler(reader.error);
            audioResultSuccessHandler = null;
            audioResultErrorHandler = null;
        };
    };
    audioRecorder.stop();

    mediaStream?.getTracks().forEach(track => track.readyState === 'live' && track.stop());
    mediaStream = null;
    return true;
}
