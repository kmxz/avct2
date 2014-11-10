"use strict";

ijkl.module('api', ['xhr2', 'promise'], function() {
    var actions = {
        // boot
        'boot/pending': { method: 'get', url: 'boot/pending' },
        'boot/action': { method: 'post', url: 'boot/pending/action', params: ['file', 'action'] },
        'boot/disappeared': { method: 'get', url: 'boot/disappeared' },
        // clip
        'clip/list': { method: 'get', url: 'clip' },
        'clip/delete': { method: 'post', url: 'clip/$/delete' },
        'clip/shot': { method: 'get', url: 'clip/$/shot' },
        'clip/edit': { method: 'post', url: 'clip/$/edit', params: ['key', 'value'] },
        'clip/open': { method: 'post', url: 'clip/$/open' },
        'clip/folder': { method: 'post', url: 'clip/$/folder' },
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
        var url = '/' + config.url;;
        var formData = null;
        if (config.url.indexOf('$') > -1) {
            if (!opt_params.id) {
                throw 'ID not provided for ' + api + '.';
            }
            url = '/' + config.url.replace('$', opt_params.id);
        }
        if (config.method === 'post') {
            formData = new FormData();
            params.forEach(function(key) {
                if (!(key in opt_params)) {
                    throw 'Parameter ' + key + ' not provided for ' + api + '.';
                }
                formData.append(key, opt_params[key]);
            });
        }
        return new Promise(function(resolve, reject) {
            var request = new XMLHttpRequest();
            request.onload = function() {
                resolve(request.response);
            };
            request.onerror = function(error) {
                alert("HTTP error occurred.");
                reject(error);
            }
            request.open(config.method, url);
            request.responseType = 'json';
            request.send(formData);
        });
    }
});
