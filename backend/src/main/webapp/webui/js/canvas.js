/*global ijkl*/

ijkl.module('canvas', ['bloburls'], function () {
    "use strict";

    return {
        loadImgToCover: function (img, ctx, opt_noAutoScale) {
            var imgWidth = img.naturalWidth || img.width;
            var imgHeight = img.naturalHeight || imgHeight;
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
            var cw = ctx.canvas.width;
            var ch = ctx.canvas.height;
            var ar = cw / ch;
            var sw = imgWidth;
            var sh = imgHeight;
            var sx = 0;
            var sy = 0;
            if (imgWidth > imgHeight * ar) { // too wide
                sw = imgHeight * ar;
                sx = (imgWidth - sw) / 2;
            } else { // too high
                sh = imgWidth / ar;
                sy = (imgHeight - sh) / 2;
            }
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
        }
    };
});