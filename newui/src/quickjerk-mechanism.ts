import { Clip } from './data';
import { TagJson } from './model';
import { crc32Str as crc32 } from './components/crc32';

// map from [0, infinity) to [0, 1)
const mapFrom0Infto01 = (input: number, reduceRatio: number): number => 1 - Math.exp(-input * reduceRatio);

// get reduceRatio by providing a value that should be mapped to 0.5
const getReduceRatio = (valueMappingToHalf: number): number => Math.log(2) / valueMappingToHalf;

interface ScoreItem {
    message: string;
    score: number;
    weightedScore: number;
}

type Scorer = (clip: Clip) => Pick<ScoreItem, 'message' | 'score'>;
type ScorerFactory<T extends Record<string, any>> = (config: T) => Scorer;

interface ScorerConfig {
    scorer: Scorer;
    weight: number;
}

const VoidFirstScorerFactory: ScorerFactory<{}> = () => clip => clip.errors ? { message: `void in ${clip.errors.size} fields`, score: 1 } : { message: 'non-void', score: 0 };

const TextSearchScorerFactory: ScorerFactory<{ keywords: string[]; includeNotes: boolean; }> = ({ keywords, includeNotes }) => clip => {
    const message: string[] = [];
    let matched = 0;
    for (const keyword of keywords) {
        const lcn = keyword.toLowerCase();
        let matchedThis = false;
        if (clip.getFile().toLowerCase().indexOf(lcn) > -1) {
            message.push(`found ${keyword} in file name`);
            matchedThis = true;
        }
        if (includeNotes && clip.note.toLowerCase().indexOf(lcn) > -1) {
            message.push(`found ${keyword} in source note`);
            matchedThis = true;
        }
        if (matchedThis) { matched++; }
    }
    return message.length ? { score: matched / keywords.length, message: message.join('; ') } : { score: 0, message: 'not found' };
};

const TagScorerFactory: ScorerFactory<{ tags: TagJson[] }> = ({ tags }) => clip => {
    const hit: string[] = [];
    for (const tag of tags) {
        if (clip.tags.indexOf(tag.id) > -1) {
            hit.push(tag.name);
        }
    }
    return hit.length ? { score: 1, message: `found: ` + hit.join(`, `) } : { score: 0, message: `not found` };
};

const LastViewScorerFactory: ScorerFactory<{ valueMappingToHalf: number }> = ({ valueMappingToHalf }) => {
    const reduceRatio = getReduceRatio(valueMappingToHalf);
    return clip => {
        if (!clip.lastPlay) { // never played
            return {
                score: 1,
                message: 'never played before'
            };
        }
        const diffDays = (new Date().getTime() / 1000 - clip.lastPlay) / (3600 * 24);
        return {
            score: mapFrom0Infto01(diffDays, reduceRatio),
            message: `last played: ` + clip.getLastPlayText()
        };
    };
};

const TotalViewScorerFactory: ScorerFactory<{ valueMappingToHalf: number }> = ({ valueMappingToHalf }) => {
    const reduceRatio = getReduceRatio(valueMappingToHalf);
    return clip => ({ score: mapFrom0Infto01(clip.totalPlay, reduceRatio), message: 'total play: ' + clip.totalPlay });
};

const RatingScorerFactory: ScorerFactory<{ treatVoid: number }> = ({ treatVoid }) => clip => (
    clip.score ? {
        score: (clip.score - 1) / 4,
        message: 'rating: ' + clip.score
    } : {
        score: (treatVoid - 1) / 4,
        message: 'no grade yet. treated as rating of ' + treatVoid
    }
);

const RandomScorerFactory: ScorerFactory<{ seed: number }> = ({ seed }) => clip => {
    let crc = crc32(`${clip.id}`, seed);
    crc = crc32(clip.path, crc);
    crc = crc32(clip.tags.join(','), crc);
    crc = crc32(clip.roles.join(','), crc);
    return {
        score: crc / 0xffffffff,
        message: 'deterministic random'
    };
};

const makeRandomScorer = (): Scorer => {
    let seed = BigInt(Date.now()) % BigInt(0xffffffff);
    seed = (25214903917n * seed + 11n) % (2n ** 48n);
    seed = seed >> 16n;
    return RandomScorerFactory({ seed: Number(seed) });
};

export class SortModel {
    private readonly residualRandomScorer = makeRandomScorer();

    constructor(public readonly scorers: ScorerConfig[]) {}

    score(clip: Clip): number {
        const rawScore = this.scoreForDetail(clip).reduce((previous, current) => previous + current.weightedScore, 0);
        return rawScore + this.residualRandomScorer(clip).score * 1e-9;
    }

    scoreForDetail(clip: Clip): ScoreItem[] {
        return this.scorers.map(scorer => scorer.scorer(clip)).map((item, index) => ({ ...item, weightedScore: item.score * this.scorers[index].weight }));
    }
}