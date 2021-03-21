// Copied from original; not adopted to TS.

export const loadImgToCover = (img: HTMLImageElement, ctx: CanvasRenderingContext2D, opt_noAutoScale?: boolean): void => {
    const imgWidth = img.naturalWidth || img.width;
    const imgHeight = img.naturalHeight || img.height;
    if (!opt_noAutoScale) {
        if (imgWidth >= 720 && imgHeight >= 480) {
            ctx.canvas.width = 720; ctx.canvas.height = 480;
            ctx.canvas.style.transform = 'scale(' + 360 / 720 + ')';
        } else if (imgWidth >= 540 && imgHeight >= 360) {
            ctx.canvas.width = 540; ctx.canvas.height = 360;
            ctx.canvas.style.transform = 'scale(' + 360 / 540 + ')';
        } else {
            ctx.canvas.width = 300; ctx.canvas.height = 200;
            ctx.canvas.style.transform = 'scale(' + 360 / 300 + ')';
        }
    }
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    const ar = cw / ch;
    let sw = imgWidth;
    let sh = imgHeight;
    let sx = 0;
    let sy = 0;
    if (imgWidth > imgHeight * ar) { // too wide
        sw = imgHeight * ar;
        sx = (imgWidth - sw) / 2;
    } else { // too high
        sh = imgWidth / ar;
        sy = (imgHeight - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
}

export const loadImgUrlToCover = (url: string, ctx: CanvasRenderingContext2D, opt_noAutoScale?: boolean): Promise<void> => new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { loadImgToCover(img, ctx, opt_noAutoScale); res(); }
    img.onerror = rej;
    img.src = url;
});