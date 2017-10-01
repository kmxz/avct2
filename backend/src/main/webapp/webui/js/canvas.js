/*global ijkl*/

ijkl.module('canvas', ['bloburls'], function () {
    "use strict";

    return {
        loadImgToCover: function (img, ctx) {
            if (img.width >= 720 && img.height >= 480) {
                ctx.canvas.width = 720; ctx.canvas.height = 480;
                ctx.canvas.style.transform = 'scale(' + 360 / 720 + ')';
            } else if (img.width >= 540 && img.height >= 360) {
                ctx.canvas.width = 540; ctx.canvas.height = 360;
                ctx.canvas.style.transform = 'scale(' + 360 / 540 + ')';
            } else {
                ctx.canvas.width = 300; ctx.canvas.height = 200;
                ctx.canvas.style.transform = 'scale(' + 360 / 300 + ')';
            }
            var cw = ctx.canvas.width;
            var ch = ctx.canvas.height;
            var ar = cw / ch;
            var w = img.width;
            var h = img.height;
            var sw = w;
            var sh = h;
            var sx = 0;
            var sy = 0;
            if (w > h * ar) { // too wide
                sw = h * ar;
                sx = (w - sw) / 2;
            } else { // too high
                sh = w / ar;
                sy = (h - sh) / 2;
            }
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
        }
    };
});