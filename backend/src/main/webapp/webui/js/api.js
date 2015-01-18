/*global ijkl*/

ijkl.module('api', ['xhr2', 'promise', 'es5Array'], function () {
    "use strict";

    var func = ijkl('function');

    var uuidRegex = /[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}/;
    var dbConnId = window.location.search.substring(1);
    if (!uuidRegex.test(dbConnId)) {
        window.location.href = '/';
    }
    var actions = {
        // boot
        'clip/autocrawl': {method: 'post', url: 'clip/autocrawl'},
        // info
        'players': {method: 'get', url: 'players'},
        // clip
        'clip/list': {method: 'get', url: 'clip'},
        'clip/delete': {method: 'post', url: 'clip/$/delete'},
        'clip/thumb': {method: 'get', url: 'clip/$/thumb', blob: true},
        'clip/saveshot': {method: 'post', url: 'clip/$/saveshot', params: ['file']},
        'clip/shot': {method: 'post', url: 'clip/$/shot', blob: true},
        'clip/edit': {method: 'post', url: 'clip/$/edit', params: ['key', 'value']},
        'clip/open': {method: 'post', url: 'clip/$/open', params: ['record']},
        'clip/openwith': {method: 'post', url: 'clip/$/openwith', params: ['player']},
        'clip/folder': {method: 'post', url: 'clip/$/folder'},
        'clip/history': {method: 'get', url: 'clip/$/history'},
        // studio
        'studio/list': {method: 'get', url: 'studio'},
        'studio/create': {method: 'post', url: 'studio/create', params: ['name']},
        // tag
        'tag/list': {method: 'get', url: 'tag'},
        'tag/create': {method: 'post', url: 'tag/create', params: ['name']},
        'tag/parent': {method: 'post', url: 'tag/$/parent', params: ['parent']},
        'tag/edit': {method: 'post', url: 'tag/$/edit', params: ['name']}
    };
    var request = function (api, opt_params) {
        var config = actions[api];
        var url = config.url;
        var formData = null;
        if (config.url.indexOf('$') > -1) {
            if (!opt_params.id) {
                throw 'ID not provided for ' + api + '.';
            }
            url = config.url.replace('$', opt_params.id);
        }
        if (config.method === 'post') {
            if (config.params && config.params.length) {
                formData = new FormData();
                config.params.forEach(function (key) {
                    if (!(opt_params.hasOwnProperty(key))) {
                        throw 'Parameter ' + key + ' not provided for ' + api + '.';
                    }
                    var value = opt_params[key];
                    if (value instanceof Array) {
                        value = JSON.stringify(value); // XXX: to JSON only when it's an array
                    }
                    formData.append(key, value);
                });
            }
        }
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open(config.method, '/serv/' + url);
            if (config.blob) {
                xhr.responseType = "blob";
            } else {
                xhr.responseType = "json";
            }
            xhr.onload = function () {
                var err;
                if (xhr.status === 200) {
                    resolve(xhr.response);
                } else {
                    err = xhr.getResponseHeader("X-Error");
                    if (window.confirm("The server rejected a request. Do you want to reload the program? Information: " + err)) {
                        window.location.href = "/";
                    }
                    reject(err);
                }
            };
            xhr.onerror = function (error) {
                window.alert("Network error occurred. It's highly recommended to reload.");
                reject(error);
            };
            xhr.setRequestHeader('X-Db-Connection-Id', dbConnId);
            xhr.send(formData);
        });
    };
    request.FATAL = function () {
        window.alert("You just ignored a fatal error. The program will fail to function if you do not reload.");
    };
    request.loadImage = function (response, opt_onload, opt_onerror) {
        var image = new Image();
        var url = window.URL.createObjectURL(response);
        var onload = opt_onload || func.doNothing;
        var onerror = opt_onerror || func.doNothing;
        image.onload = function (ev) {
            window.URL.revokeObjectURL(url);
            onload.call(this, ev);
        };
        image.onerror = function (ev) {
            window.URL.revokeObjectURL(url);
            onerror.call(this, ev);
        };
        image.src = url;
        return image;
    };
    return request;
});
