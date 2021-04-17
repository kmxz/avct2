import { Clip } from './data';
import { Race, RACES, Role, ROLES, TagJson } from './model';
import { crc32Str as crc32 } from './components/crc32';
import { TemplateResult } from 'lit-html';
import { html } from './components/registry';
import { AvctTagListSimple } from './tags';
import { seq } from './components/utils';
import { globalDialog } from './components/dialog';
import { QuickjerkModal } from './dialogs/quickjerk-modal'; 

// map from [0, infinity) to [0, 1)
const mapFrom0Infto01 = (input: number, reduceRatio: number): number => 1 - Math.exp(-input * reduceRatio);

// get reduceRatio by providing a value that should be mapped to 0.5
const getReduceRatio = (valueMappingToHalf: number): number => Math.log(2) / valueMappingToHalf;

interface ScoreItemOutput { readonly message: string; readonly score: number; }
export interface ScoreItem extends ScoreItemOutput {
    readonly weight: number;
    readonly name: string;
}

type ScorerParams = Record<string, any> | void;
type ScorerFunction = (clip: Clip) => ScoreItemOutput;

interface ScorerDefinition<T extends ScorerParams> {
    readonly name: string;
    readonly factory: (config: T) => ScorerFunction;
    readonly configUi: (current: T) => TemplateResult | null;
    readonly default: T;
    readonly describe?: (config: T) => string;
}

export interface ScorerBuilder<T extends ScorerParams> {
    readonly key: string;
    readonly implementation: ScorerDefinition<T>;
    readonly config: T;
    readonly weight: number;
    built?: ScorerFunction;
}

type Scorer = Required<ScorerBuilder<any>>;

export const MAXIMUM_WEIGHT = 1e2;
export const MINIMUM_WEIGHT = 1e-1;
export const DEFAULT_WEIGHT = 1;

const idSeq = seq();

export const scorerBuilder = <T>(definition: ScorerDefinition<T>, weight?: number): ScorerBuilder<T> => ({
    key: `${idSeq()}`,
    implementation: definition,
    weight: weight || 1,
    config: definition.default
});

const VOID_FIRST: ScorerDefinition<void> = {
    name: 'Void first',
    factory:  () => clip => clip.errors ? { message: `void in ${clip.errors.size} fields`, score: 1 } : { message: 'non-void', score: 0 },
    default: void 0,
    configUi: () => null
}

const TEXT_SEARCH: ScorerDefinition<{ keywords: string; includeNotes: boolean; fullPath: boolean; }> = {
    name: 'Text search',
    factory: ({ keywords, includeNotes, fullPath }) => clip => {
        const message: string[] = [];
        const keywordsArray = keywords.split(/\s+/).filter(word => word);
        let matched = 0;
        for (const keyword of keywordsArray) {
            const lcn = keyword.toLowerCase();
            let matchedThis = false;
            if ((fullPath ? clip.path : clip.getFile()).toLowerCase().indexOf(lcn) > -1) {
                message.push(`found ${keyword} in file name`);
                matchedThis = true;
            }
            if (includeNotes && clip.note.toLowerCase().indexOf(lcn) > -1) {
                message.push(`found ${keyword} in source note`);
                matchedThis = true;
            }
            if (matchedThis) { matched++; }
        }
        return message.length ? { score: matched / keywordsArray.length, message: message.join('; ') } : { score: 0, message: 'not found: ' + keywordsArray.join(', ') };
    },
    default: { keywords: '', includeNotes: true, fullPath: false },
    configUi: current => html`
        <input type="text" name="keywords" value="${current.keywords}" />
        <input type="checkbox" name="includeNotes" ?checked="${current.includeNotes}" /> Note
        <input type="checkbox" name="fullPath" ?checked="${current.fullPath}" /> Full-path
    `,
    describe: ({ keywords, includeNotes, fullPath }) => `${keywords.split(/\s+/).filter(word => word).length} keyword(s), notes ${includeNotes ? 'included' : 'excluded'}${fullPath ? ', full-path match': ''}`
};

const TAGS: ScorerDefinition<{ value: TagJson[] }> = {
    name: 'Tags (match any of)',
    factory: ({ value }) => clip => {
        const hit: string[] = value.filter(tag => clip.tags.has(tag.id)).map(tag => tag.name);
        return hit.length ? { score: 1, message: 'found: ' + hit.join(', ') } : { score: 0, message: 'not found: ' + value.map(tag => tag.name).join(', ') };
    },
    default: { value: [] },
    configUi: current => html`
        <${AvctTagListSimple} .tags="${current.value}"></${AvctTagListSimple}>
    `,
    describe: ({ value }) => `Tags (any of ${value.length})`
};

const RACE: ScorerDefinition<{ race: Race | undefined }> = {
    name: 'Race',
    factory: ({ race }) => clip => (
        race ? (clip.race === race ? { score: 1, message: `matched ${race}` } : { score: 0, message: `unmatched ${race}` }) : { score: 0, message: 'configuration invalid' }
    ),
    default: { race: void 0 },
    configUi: current => html`
        <select name="race">${RACES.map(item => html`<option value="${item}" ?selected="${current.race === item}">${item}</option>`)}</select>
    `
};

const ROLE: ScorerDefinition<{ role: Role | undefined }> = {
    name: 'Role',
    factory: ({ role }) => clip => (
        role ? (clip.roles.includes(role) ? { score: 1, message: `found ${role}` } : { score: 0, message: `not found ${role}` }) : { score: 0, message: 'configuration invalid' }
    ),
    default: { role: void 0 },
    configUi: current => html`
        <select name="role">${ROLES.map(item => html`<option value="${item}" ?selected="${current.role === item}">${item}</option>`)}</select>
    `
};

const LAST_VIEW: ScorerDefinition<{ valueMappingToHalf: number }> = {
    name: 'Last view',
    factory: ({ valueMappingToHalf }) => {
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
    },
    default: { valueMappingToHalf: 30 },
    configUi: current => html`
        <input type="number" name="valueMappingToHalf" value="${current.valueMappingToHalf}" min="0.1" max="1000" step="0.1" /> days ago
    `
};

const TOTAL_VIEWS: ScorerDefinition<{ valueMappingToHalf: number }> = {
    name: 'Total views',
    factory: ({ valueMappingToHalf }) => {
        const reduceRatio = getReduceRatio(valueMappingToHalf);
        return clip => ({ score: mapFrom0Infto01(clip.totalPlay, reduceRatio), message: 'total play: ' + clip.totalPlay });
    },
    default: { valueMappingToHalf: 5 },
    configUi: current => html`
        <input type="number" name="valueMappingToHalf" value="${current.valueMappingToHalf}" min="1" max="1000" step="1" /> views
    `
};

const RATING: ScorerDefinition<{ treatVoid: number }> = {
    name: 'Rating',
    factory: ({ treatVoid }) => clip => (
        clip.score ? {
            score: (clip.score - 1) / 4,
            message: 'rating: ' + clip.score
        } : {
            score: (treatVoid - 1) / 4,
            message: 'no grade yet. treated as rating of ' + treatVoid
        }
    ),
    default: { treatVoid: 3 },
    configUi: current => html`
        Treat unrated as <input type="number" name="treatVoid" value="${current.treatVoid}" min="1" max="5" step="1" />
    `
};

const RANDOM: ScorerDefinition<void> = {
    name: 'Random',
    factory: () => {
        const seedValue = (Math.random() * 0xffffffff) | 0;
        return clip => {
            let crc = crc32(clip.path, seedValue);
            crc = crc32(`${clip.id}`, crc);
            return {
                score: crc / 0xffffffff + 0.5,
                message: `from id ${clip.id}`
            };
        };
    },
    default: void 0,
    configUi: () => null
};

export const POSSIBLE_SCORERS: ScorerDefinition<any>[] = [
    VOID_FIRST, TEXT_SEARCH, RACE, ROLE, TAGS, LAST_VIEW, TOTAL_VIEWS, RATING, RANDOM
];

export class SortModel {
    private readonly residualRandomScorer = RANDOM.factory();
    private readonly scorers: Scorer[];
    readonly ruleCount: number;

    constructor(builders: ScorerBuilder<any>[]) {
        this.scorers = builders.map(SortModel.build);
        this.ruleCount = this.scorers.length;
    }

    // Instances should be reused whereever possible.
    private static build(builder: ScorerBuilder<any> | Scorer): Scorer {
        if (!builder.built) { builder.built = builder.implementation.factory(builder.config); }
        return builder as Scorer;
    }

    static readonly DEFAULT = new SortModel([
        scorerBuilder(VOID_FIRST, MAXIMUM_WEIGHT * 1e2),
        scorerBuilder(LAST_VIEW, 0.2),
        scorerBuilder(RATING, 1),
        scorerBuilder(RANDOM, 5),
    ]);

    score(clip: Clip): number {
        const rawScore = this.scoreForDetail(clip).reduce((previous, current) => previous + current.weight * current.score, 0);
        return rawScore + this.residualRandomScorer(clip).score * 1e-9;
    }

    scoreForDetail(clip: Clip): ScoreItem[] {
        return this.scorers.map(scorer => scorer.built(clip)).map((item, index) => {
            const config = this.scorers[index];
            const name = config.implementation.describe?.call(null, config.config) || config.implementation.name;
            return { ...item, weight: config.weight, name };
        });
    }

    edit(): Promise<SortModel> {
        const builders = this.scorers.map(item => ({ ...item }));
        return globalDialog({ type: QuickjerkModal, params: builders, title: 'Quickjerm sorting config' });
    }
}