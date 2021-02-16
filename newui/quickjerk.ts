import { QjCriterion, Race, Role, Tag, Clip } from './model';

// map from [0, infinity) to [0, 1)
const mapFrom0Infto01 = (input: number, reduceRatio: number) => 1 - Math.exp(-input * reduceRatio);

// get reduceRatio by providing a value that should be mapped to 0.5
const getReduceRatio = (valueMappingToHalf: number) => Math.log(2) / valueMappingToHalf;

const builders = {
    race: (raceEntry: Race) =>
        new QjCriterion("Race: " + raceEntry, clip => 
             clip.data.race === raceEntry ? {score: 1, message: "race matched"} : {score: 0, message: "race not matched"}
        ),
    role: (roleEntries: Role[]) =>
        new QjCriterion("Role: " + roleEntries.join(", "), clip => {
            var hit = [];
            roleEntries.forEach(function (role) {
                if (clip.data.role.indexOf(role) > -1) {
                    hit.push(role);
                }
            });
            return hit.length ? {score: 1, message: "found: " + hit.join(", ")} : {score: 0, message: "not found"};
        }),
    grade: (treatVoid: number) =>
        new QjCriterion("Grade", clip =>
            clip.data.grade ? {
                score: (clip.data.grade - 1) / 4,
                message: "grade: " + clip.data.grade
            } : {
                score: (treatVoid - 1) / 4,
                message: "no grade yet. treated as grade of " + treatVoid
            }
        ),
    tag: (tagEntries: Tag[]) => 
        new QjCriterion("Tags: " + tagEntries.map(function (tag) { return tag.name; }).join(", "), clip => {
            var hit = [];
            tagEntries.forEach(function (tag) {
                if (clip.data.tags.indexOf(tag.id) > -1) {
                    hit.push(tag.name);
                }
            });
            return hit.length ? {score: 1, message: "found: " + hit.join(", ")} : {score: 0, message: "not found"};
        }),
    keyword: (keywords: string[], countSourceNote: boolean) =>
        new QjCriterion("Keyword \"" + keywords.join(", ") + "\"", clip => {
            var message = [];
            var matched = 0;
            keywords.forEach(function (keyword) {
                var lcn = keyword.toLowerCase();
                var matchedThis = false;
                if (clip.file.toLowerCase().indexOf(lcn) > -1) {
                    message.push("found \"" + keyword + "\" in file name");
                    matchedThis = true;
                }
                if (countSourceNote && clip.data.sourceNote.toLowerCase().indexOf(lcn) > -1) {
                    message.push("found \"" + keyword + "\" in source note");
                    matchedThis = true;
                }
                if (matchedThis) { matched++; }
            });
            return message.length ? {score: matched / keywords.length, message: message.join("; ")} : {score: 0, message: "not found"};
        }),
    lastView: (valueMappingToHalf: number) => {
        var reduceRatio = getReduceRatio(valueMappingToHalf);
        return new QjCriterion("Last view (half: " + valueMappingToHalf.toFixed(3) + ", ratio: " + reduceRatio.toFixed(3), clip => {
            if (clip.data.lastPlay === 0) { // never played
                return {
                    score: 1,
                    message: "never played before"
                };
            }
            var diffDays = (new Date().getTime() / 1000 - clip.data.lastPlay) / (3600 * 24);
            return {
                score: mapFrom0Infto01(diffDays, reduceRatio),
                message: "last played: " + diffDays.toFixed(3) + " days ago"
            };
        });
    },
    playCount: (valueMappingToHalf: number) => {
        var reduceRatio = getReduceRatio(valueMappingToHalf);
        return new QjCriterion("Total play (half: " + valueMappingToHalf.toFixed(3) + ", ratio: " + reduceRatio.toFixed(3), clip => {
            return { score: mapFrom0Infto01(clip.data.totalPlay, reduceRatio), message: "total play: " + clip.data.totalPlay };
        });
    },
    random: () => 
        new QjCriterion("Random", clip => {
            var random = Math.random();
            return { score: random, message: random.toFixed(3) + " taken" };
        })
};

const calcForClip = function (clip: Clip, criteria: QjCriterion[]) {
    clip.jerkEntries = criteria.map(criterion => criterion.doCalc(clip));
    clip.jerkScore = clip.jerkEntries.map(entry => entry.weightedScore).reduce((a, b) => a + b, 0);
    // TODO: rerender?
};