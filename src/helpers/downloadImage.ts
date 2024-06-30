function downloadImage(imageSrcUrl: string, resultType: string = "image/jpeg") {
    const image = document.querySelector(`img[src="${imageSrcUrl}"]`) as HTMLImageElement;
    if (!image) {
        return null;
    }
    try {
        const imageDuplicate = image.cloneNode() as HTMLImageElement;
        imageDuplicate.crossOrigin = "Anonymous";
        const canvas = document.createElement("canvas");
        const canvasCtx = canvas.getContext("2d");
        canvas.width = image.clientWidth;
        canvas.height = image.clientHeight;
        if (canvasCtx) {
            canvasCtx.drawImage(imageDuplicate, 0, 0);
            const result = canvas.toDataURL(resultType, 30);
            canvas.remove();
            return result;
        }
    }
    catch (err){
        return null;
    }
    return null;
}

export {downloadImage};