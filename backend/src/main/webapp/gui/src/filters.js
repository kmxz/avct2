avct2.filter('fileName', function() {
    return function(fullPath) {
        return fullPath.split('/').pop();
    }
});

avct2.filter('tagsJoin', function() {
    return function(tags) {
        return tags.join(', ');
    }
});

avct2.filter('humanReadableSize', function() {
    return function(size) {
        var i = 0;
        var byteUnits = ['B', 'KB', 'MB', 'GB', 'TB'];
        while (size > 1024) {
            size = size / 1024;
            i++;
        }
        // always keep 3 significant digits
        return parseFloat(size.toPrecision(3)) + ' ' + byteUnits[i];
    }
});

avct2.filter('durationInMinutes', function() {
    return function(sec) {
        if (sec <= 0) { return "N/A"; }
        var min = Math.floor(sec / 60);
        return min + ":" + (sec % 60);
    }
});