avct2.factory('sources', function($http) {
    var actions = {
        // boot
        'boot/pending': { method: 'get', url: 'boot/pending' },
        'boot/action': { method: 'post', url: 'boot/pending/action', params: ['file', 'action'] },
        'boot/disappeared': { method: 'get', url: 'boot/disappeared' },
        // clip
        'clip/list': { method: 'get', url: 'clip.js' },
        'clip/delete': { method: 'post', url: 'clip/$/delete' },
        'clip/shot': { method: 'get', url: 'clip/$/shot' },
        'clip/edit': { method: 'post', url: 'clip/$/edit', params: ['key', 'value'] },
        'clip/open': { method: 'get', url: 'clip/$/open' },
        'clip/history': { method: 'get', url: 'clip/$/history' },
        // studio
        'studio/list': { method: 'get', url: 'studio' },
        // tag
        'tag/list': { method: 'get', url: 'tag' },
        'tag/create': { method: 'post', url: 'tag/create' },
        'tag/info': { method: 'get', url: 'tag/$' },
        'tag/parents': { method: 'post', url: 'tag/$/parents', params: ['parents'] },
        'tag/edit': { method: 'post', url: 'tag/$/edit', params: ['name'] },
        // quickjerk
        'quickjerk': { method: 'get', url: 'quickjerk', params: [/* todo */] },
    };
    return function(api, opt_params) {
        var config = actions[api];
        var meta = {
            method: config.method,
        };
        var i;
        if (config.url.indexOf('$') > -1) {
            if (!opt_params.id) {
                throw 'ID not provided for ' + api + '.';
            }
            meta.url = '/' + config.url.replace('$', opt_params.id);
        } else {
            meta.url = '/' + config.url;
        }
        if (config.method === 'post') {
            meta.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
            meta.data = {};
            params.forEach(function(key) {
                if (!(key in opt_params)) {
                    throw 'Parameter ' + key + ' not provided for ' + api + '.';
                }
                meta.data[key] = opt_params[key];
            });
        }
        return $http(meta).error(function() { 
            console.log(arguments);
            throw "HTTP error for " + api + "!";
        });
    }
});