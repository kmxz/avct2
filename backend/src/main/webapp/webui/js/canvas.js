/*global ijkl*/

ijkl.module('canvas', ['bloburls'], function () {
    "use strict";

    return {
        loadImgToCover: function (img, ctx) {
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