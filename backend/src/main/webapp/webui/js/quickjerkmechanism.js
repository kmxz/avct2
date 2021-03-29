/*global ijkl*/

ijkl.module('quickjerkmechanism', ['es5Array'], function () {
    "use strict";

    var clipobj = ijkl('clipobj');
    var dom = ijkl('dom');
    var func = ijkl('function');
    var sm = ijkl('studiomanager');

    var voidFirst = document.getElementById('voidFirst');
    var hide0 = document.getElementById('hide0');
    var shownClipsSpan = document.getElementById('shown-clips');
    var extable;
    var lastCriteria;

    var ResultEntry = function (criterion, score, message) {
        this.criterion = criterion;
        this.score = score;
        this.message = message;
        this.weightedScore = score * criterion.weight;
    };

    ResultEntry.prototype.getTr = function () {
        return dom('tr', null, [
            dom('td', null, this.criterion.name),
            dom('td', null, this.criterion.weight.toFixed(3)),
            dom('td', null, this.score.toFixed(3)),
            dom('td', null, this.message),
            dom('td', null, this.weightedScore.toFixed(3))
        ]);
    };

    var Criterion = function (name, calc) { // "calc" should return the { score, message }
        this.name = name;
        this.calc = calc;
        this.weight = 1;
    };

    Criterion.prototype.doCalc = function (clip) {
        var result = this.calc(clip);
        return new ResultEntry(this, result.score, result.message);
    };

    var calcForClip = function (clip, criteria) {
        clip.jerkEntries = criteria.map(function (criterion) {
            return criterion.doCalc(clip);
        });
        clip.jerkScore = clip.jerkEntries.map(function (entry) {
            return entry.weightedScore;
        }).reduce(function (a, b) { return a + b; }, 0);
        clip.renderColumn(clipobj.columns.score);
    };

    // map from [0, infinity) to [0, 1)
    var mapFrom0Infto01 = function (input, reduceRatio) { return 1 - Math.exp(-input * reduceRatio); };

    // get reduceRatio by providing a value that should be mapped to 0.5
    var getReduceRatio = function (valueMappingToHalf) {
        return Math.log(2) / valueMappingToHalf;
    };

    var builders = {
        race: function (raceEntry) {
            return new Criterion("Race: " + raceEntry, function (clip) {
                return clip.race === raceEntry ? {score: 1, message: "race matched"} : {score: 0, message: "race not matched"};
            });
        },
        role: function (roleEntries) {
            return new Criterion("Role: " + roleEntries.join(", "), function (clip) {
                var hit = [];
                roleEntries.forEach(function (role) {
                    if (clip.role.indexOf(role) > -1) {
                        hit.push(role);
                    }
                });
                return hit.length ? {score: 1, message: "found: " + hit.join(", ")} : {score: 0, message: "not found"};
            });
        },
            grade: function (treatVoid) {
            return new Criterion("Grade", function (clip) {
                return clip.grade ? {
                    score: (clip.grade - 1) / 4,
                    message: "grade: " + clip.grade
                } : {
                    score: (treatVoid - 1) / 4,
                    message: "no grade yet. treated as grade of " + treatVoid
                };
            });
        },
        tag: function (tagEntries) {
            return new Criterion("Tags: " + tagEntries.map(function (tag) { return tag.name; }).join(", "), function (clip) {
                var hit = [];
                tagEntries.forEach(function (tag) {
                    if (clip.tags.indexOf(tag.id) > -1) {
                        hit.push(tag.name);
                    }
                });
                return hit.length ? {score: 1, message: "found: " + hit.join(", ")} : {score: 0, message: "not found"};
            });
        },
        keyword: function (keywords, countSourceNote) {
            return new Criterion("Keyword \"" + keywords.join(", ") + "\"", function (clip) {
                var message = [];
                var matched = 0;
                keywords.forEach(function (keyword) {
                    var lcn = keyword.toLowerCase();
                    var matchedThis = false;
                    if (clip.file.toLowerCase().indexOf(lcn) > -1) {
                        message.push("found \"" + keyword + "\" in file name");
                        matchedThis = true;
                    }
                    if (countSourceNote && clip.sourceNote.toLowerCase().indexOf(lcn) > -1) {
                        message.push("found \"" + keyword + "\" in source note");
                        matchedThis = true;
                    }
                    if (matchedThis) { matched++; }
                });
                return message.length ? {score: matched / keywords.length, message: message.join("; ")} : {score: 0, message: "not found"};
            });
        },
        lastView: function (valueMappingToHalf) {
            var reduceRatio = getReduceRatio(valueMappingToHalf);
            return new Criterion("Last view (half: " + valueMappingToHalf.toFixed(3) + ", ratio: " + reduceRatio.toFixed(3), function (clip) {
                if (typeof clip.lastPlay !== 'number') { // never played
                    return {
                        score: 1,
                        message: "never played before"
                    };
                }
                var diffDays = (new Date().getTime() / 1000 - clip.lastPlay) / (3600 * 24);
                return {
                    score: mapFrom0Infto01(diffDays, reduceRatio),
                    message: "last played: " + diffDays.toFixed(3) + " days ago"
                };
            });
        },
        playCount: function (valueMappingToHalf) {
            var reduceRatio = getReduceRatio(valueMappingToHalf);
            return new Criterion("Total play (half: " + valueMappingToHalf.toFixed(3) + ", ratio: " + reduceRatio.toFixed(3), function (clip) {
                return { score: mapFrom0Infto01(clip.totalPlay, reduceRatio), message: "total play: " + clip.totalPlay };
            });
        },
        random: function () {
            return new Criterion("Random", function () {
                var random = Math.random();
                return { score: random, message: random.toFixed(3) + " taken" };
            });
        },
        studio: function (studioId) {
            return new Criterion("Studio " + sm.getStudio(studioId), function (clip) {
                return (clip.studio === studioId) ? {score: 1, message: "studio matched"} : {score: 0, message: "studio not matched"};
            });
        }
    };

    var runCriteria = function (criteria) {
        lastCriteria = criteria;
        var updater = function (clip) {
            calcForClip(clip, criteria);
        };
        var voidFirstActivated = voidFirst.checked;
        var hide0Activated = hide0.checked;
        var clips = clipobj.getClips;
        var shown = 0;
        func.forEach(clips, updater);
        clipobj.setQuickJerkScoreUpdater(updater);
        extable.pool.splice(0, extable.pool.length);
        func.toArray(clips).map(function (clip) {
            return {
                clip: clip,
                random: Math.random()
            };
        }).sort(function (c1, c2) {
            return (voidFirstActivated && (c2.clip.isAnyVoid() - c1.clip.isAnyVoid())) || (c2.clip.jerkScore - c1.clip.jerkScore) || (c2.random - c1.random);
        }).forEach(function (mapped) {
            var item = mapped.clip;
            if (!(hide0Activated && item.jerkScore <= 0)) {
                extable.pool.push(item.tr);
                shown++;
            }
        });
        extable.reRender();
        shownClipsSpan.innerHTML = shown;
    };

    return {
        builders: builders,
        runCriteria: runCriteria,
        init: function (theExtable) {
            extable = theExtable;
            var initListener = function (suffix, criterion) {
                document.getElementById('quickjerk-btn-' + suffix).addEventListener('click', function () {
                    runCriteria([criterion]);
                });
            };
            initListener('random', builders.random());
            initListener('grade', builders.grade(3));
            var lastViewCriterion = builders.lastView(15);
            lastViewCriterion.weight = -1;
            initListener('most-recent', lastViewCriterion);
            var rerun = function () {
                runCriteria(lastCriteria);
            };
            voidFirst.addEventListener('change', rerun);
            hide0.addEventListener('change', rerun);
            runCriteria([]);
        }
    };
});