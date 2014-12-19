/*global ijkl*/

ijkl.module('players', [], function () {
    "use strict";

    var api = ijkl('api');

    var actualPlayers = null;
    return {
        init: function () {
            return api('players').then(function (json) {
                actualPlayers = json;
            }, api.FATAL);
        },
        actualPlayers: function () {
            return actualPlayers;
        }
    };
});