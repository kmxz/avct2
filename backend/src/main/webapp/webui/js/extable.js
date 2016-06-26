/*global ijkl*/

ijkl.module('extable', [], function () {
    "use strict";

    return function (tbody, scrollable) {
        var pool = [];
        var currTill = -1; // this first index that is NOT shown
        var tryLayout = function () {
            if (currTill >= pool.length) { return; } // already fully loaded
            var end = Math.min(currTill + ((scrollable.scrollHeight <= scrollable.offsetHeight) ? 30 : 10), pool.length); // load 30 elements at beginning, but 10 each time afterwards
            if (scrollable.scrollHeight - scrollable.scrollTop < 2 * scrollable.offsetHeight) {
                while ((++currTill) < end) {
                    tbody.appendChild(pool[currTill]);
                }
                // setTimeout(tryLayout, 0);
            }
        };
        window.addEventListener('resize', tryLayout);
        scrollable.addEventListener('scroll', tryLayout);
        return {
            pool: pool, // container of <tr>s
            reRender: function () {
                while (tbody.lastChild) {
                    tbody.removeChild(tbody.lastChild);
                }
                currTill = -1;
                tryLayout();
            }
        };
    };
});
