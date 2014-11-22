"use strict";

ijkl.module('players', [], function() {

    var api = ijkl('api');

    var actualPlayers = null;
    return {
        init: function() {
            return api('players').then(function(json) {
                actualPlayers = json;
            }, api.FATAL);
        },
        actualPlayers: function() { return actualPlayers; }
    }
});