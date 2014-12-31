/*global ijkl*/

ijkl.module('quickjerkmechanism', ['es5Array'], function () {
    "use strict";

    var clipobj = ijkl('clipobj');
    var dom = ijkl('dom');
    var func = ijkl('function');

    var voidFirst = document.getElementById('voidFirst');
    var hide0 = document.getElementById('hide0');
    var tbody;

    var ResultEntry = function (criteria, score, message) {
        this.criteria = criteria;
        this.score = score;
        this.message = message;
        this.weightedScore = score * criteria.weight;
    };

    ResultEntry.prototype.getTr = function () {
        return dom('tr', null, [
            dom('td', null, this.criteria.name),
            dom('td', null, this.score),
            dom('td', null, this.criteria.weight),
            dom('td', null, this.weightedScore)
        ]);
    };

    var Criteria = function (name, calc, weight, opt_postNormalize, opt_skippable) { // "calc" should return the { score, message }
        this.name = name;
        this.calc = calc;
        this.weight = weight;
        this.postNormalize = opt_postNormalize || func.doNothing; // TODO: remove this
        this.skippable = opt_skippable || function () { return false; };
    };

    Criteria.prototype.doCalc = function (clip) {
        var result = this.calc(clip);
        return new ResultEntry(this, result.score, result.message);
    };

    var jerk = function (clips, criterias) {
        clips.forEach(function (clip) {
            clip.jerkEntries = {};
            criterias.forEach(function (criteria) {
                if (criteria.skippable) { return; }
                clip.jerkEntries[criteria.name] = criteria.doCalc(clip);
            });
            clip.jerkScore = func.toArray(clip.jerkEntries).map(function (entry) {
                return entry.weightedScore;
            }).reduce(function (a, b) { return a + b; }, 0);
        });
    };

    // map from [0, infinity) to [0, 1)
    var mapFrom0Infto01 = function (input, reduceRatio) { return 1 - 1 / (Math.log(input / reduceRatio + 1) + 1); };

    // get reduceRatio by providing a value that should be mapped to 0.5
    var getReduceRatio = function (valueMappingToHalf) {
        return valueMappingToHalf / (Math.E - 1);
    };

    return {
        builders: {
            race: function (raceEntry) {
                return new Criteria("Race: " + raceEntry, function (clip) {
                    return clip.race === raceEntry ? {score: 1, message: "race matched"} : {
                        score: 0,
                        message: "race not matched"
                    };
                });
            },
            role: function (roleEntries) {
                return new Criteria("Role: " + roleEntries.join(", "), function (clip) {
                    var hit = [];
                    roleEntries.forEach(function (role) {
                        if (clip.role.indexOf(role) > -1) {
                            hit.push(role);
                        }
                    });
                    return hit.length ? {score: 1, message: "found: " + hit.join(", ")} : {score: 0, message: "not found"};
                });
            },
            grade: function () {
                return new Criteria("Grade", function (clip) {
                    return { score: (clip.grade - 1) / 4, message: "grade: " + clip.grade };
                });
            },
            tag: function (tagEntries) {
                return new Criteria("Tags: " + tagEntries.map(function (tag) { return tag.name; }).join(", "), function (clip) {
                    var hit = [];
                    tagEntries.forEach(function (tag) {
                        if (clip.tags.indexOf(tag.id) > -1) {
                            hit.push(tag.name);
                        }
                    });
                    return hit.length ? {score: 1, message: "found: " + hit.join(", ")} : {score: 0, message: "not found"};
                });
            },
            keyword: function (name, countSourceNote) {
                return new Criteria("Keyword \"" + name + "\"", function (clip) {
                    var message = [];
                    var lcn = name.toLowerCase();
                    if (clip.file.toLowerCase().indexOf(lcn) > -1) {
                        message.push("found in file name");
                    }
                    if (countSourceNote && clip.sourceNote.toLowerCase().indexOf(lcn) > -1) {
                        message.push("found in source note");
                    }
                    return message.length ? {score: 1, message: message.join(";")} : {score: 0, message: "not found"};
                });
            },
            lastView: function (valueMappingToHalf) {
                var reduceRatio = getReduceRatio(valueMappingToHalf);
                return new Criteria("Last view", function (clip) {
                    var diffDays = (new Date().getTime() / 1000 - clip.lastPlay) / (3600 * 24);
                    return { score: mapFrom0Infto01(diffDays, reduceRatio), message: "last played: " + diffDays.toFixed(2) + " days ago" };
                });
            },
            playCount: function (valueMappingToHalf) {
                var reduceRatio = getReduceRatio(valueMappingToHalf);
                return new Criteria("Total play", function (clip) {
                    return { score: mapFrom0Infto01(clip.totalPlay, reduceRatio), message: "total play: " + clip.totalPlay };
                });
            },
            random: function () {
                return new Criteria("Random", function () {
                    var random = Math.random();
                    return { score: random, message: random };
                });
            }
        },
        runCriterias: function (criterias) {
            var clips = clipobj.getClips();
            jerk(clips, criterias); // after which, rearrange items
            func.toArray(clips).sort(function (x, y) {
                return (y.jerkScore - x.jerkScore) || (Math.random() - 0.5);
            }).forEach(function (item) {
                tbody.appendChild(item);
            });
        },
        init: function (theTbody) {
            tbody = theTbody;
        }
    };
});