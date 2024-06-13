navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    stream.getTracks().forEach(track => track.readyState === 'live' && track.stop());
}).catch(err => {
    console.error(err);
});