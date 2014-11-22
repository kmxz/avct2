"use strict";

ijkl.module('api', ['xhr2', 'promise', 'es5Array'], function() {
    var uuidRegex = /[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}/;
    var dbConnId = window.location.search.substring(1);
    if (!uuidRegex.test(dbConnId)) {
        window.location.href = '/';
    }
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
        'tag/create': { method: 'post', url: 'tag/create', params: ['name'] },
        'tag/parent': { method: 'post', url: 'tag/$/parent', params: ['parent'] },
        'tag/edit': { method: 'post', url: 'tag/$/edit', params: ['name'] },
        // quickjerk
        'quickjerk': { method: 'get', url: 'quickjerk', params: [/* todo */] }
    };
    var request = function(api, opt_params) {
        var config = actions[api];
        var url = config.url;
        var formData = null;
        if (config.url.indexOf('$') > -1) {
            if (!opt_params['id']) {
                throw 'ID not provided for ' + api + '.';
            }
            url = config.url.replace('$', opt_params['id']);
        }
        if (config.method === 'post') {
            formData = new FormData();
            config.params.forEach(function(key) {
                if (!(key in opt_params)) {
                    throw 'Parameter ' + key + ' not provided for ' + api + '.';
                }
                var value = opt_params[key];
                if (value instanceof Array) {
                    value = JSON.stringify(value); // to JSON only when it's an array
                }
                formData.append(key, value);
            });
        }
        return new Promise(function(resolve, reject) {
            var request = new XMLHttpRequest();
            request.onload = function() {
                if (request.status == 200) {
                    try {
                        resolve(JSON.parse(request.responseText));
                    } catch (_) {
                        window.alert("Response parsing failed.");
                    }
                } else {
                    reject(request.responseText);
                }
            };
            request.onerror = function(error) {
                window.alert("Network error occurred. It's highly recommended to reload.");
                reject(error);
            }
            request.open(config.method, '/serv/' + url);
            request.setRequestHeader('X-Db-Connection-Id', dbConnId);
            request.send(formData);
        });
    };
    request.FATAL = function(reason) {
        if (window.confirm("This seems to be a fatal server error. Restart the program? Information: " + reason)) {
            window.location.href = "/";
        }
    };
    request.ALERT = function(reason) {
        window.alert("The server rejected your request: " + reason);
    };
    return request;
});
