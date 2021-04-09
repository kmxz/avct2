import { ClipJson, Race, RACES, Role, ROLES, TagJson } from './model';
import { globalToast } from './components/toast';

class Lcg {
    private static readonly a = 25214903917n;
    private static readonly c = 11n;
    private static readonly m = 2n ** 48n;
    static readonly i31cap = (2n ** 31n) - 1n;

    constructor(private seed: bigint) {}

    nextI31(): number {
        this.seed = (this.seed * Lcg.a + Lcg.c) % Lcg.m;
        return Number((this.seed >> 16n) % Lcg.i31cap);
    }

    nextFloat(): number { return this.nextI31() / Number(Lcg.i31cap); }
}

const toScore = (randFloat: number): number => (randFloat > 0.5) ? 0 : (Math.floor(randFloat / 0.1) + 1);
const toRace = (randFloat: number): Race => RACES[Math.floor(randFloat * RACES.length)];
const toRoles = (randI31: number): Role[] => {
    return ROLES.filter((_, index) => !((randI31 >> (index * 2)) & 3));
};
const toResolution = (randFloat: number) => Math.floor(240 * Math.pow(2, randFloat * 10 / 3));
const toPath = (randI31: number): string => {
    const out: string[] = [];
    for (let i = 0; i < 5; i++) {
        const section = (randI31 >> (i * 6)) & 63;
        const character = section.toString(16);
        let str = character;
        for (let i = 0; i < (section >> 3); i++) {
            str += character;
        }
        out.push(str);
        if (section & 1) {
            break;
        }
    }
    return out.join('/') + '.mp4';
};
const toTags = (randI31: number): number[] => {
    const out: number[] = [];
    for (let i = 0; i < 15; i++) {
        if (!((randI31 >> (2 * i)) & 3)) {
            out.push(i + 1);
        }
    }
    return out;
};

const generateFakeClip = (id: number): ClipJson => {
    const lcg = new Lcg(BigInt(id) * 214013n + 2531011n);
    const numberOfHistory = Math.max(Math.floor(Math.exp(lcg.nextFloat() * 5) - 5), 0);
    const lastOfHistory = Date.now() / 1000 - Math.exp(10 * lcg.nextFloat()) * 1000;
    return [
        id, toPath(lcg.nextI31()), toRace(lcg.nextFloat()), toRoles(lcg.nextI31()), toScore(lcg.nextFloat()), 5000000, 360, toTags(lcg.nextI31()), numberOfHistory, numberOfHistory ? lastOfHistory : 0, ((id % 10) < 7), `fake clip ${id}`, toResolution(lcg.nextFloat())
    ];
};

const fakeClips: ClipJson[] = [];

for (let i = 1; i < 100; i++) {
    fakeClips.push(generateFakeClip(i));
}

const FAKE_RESULTS: Record<string, (params: { [key: string]: any }) => any> = {
    'clip': (): ClipJson[] => fakeClips,
    'clip/edit': params => {
        const clip = fakeClips[params['id'] - 1]!;
        const indices: Record<string, number> = { 'grade': 4, 'race': 2, 'role': 3, 'tags': 7, 'sourceNote': 11 };
        if (params['key'] in indices) {
            clip[indices[params['key']]] = params['value'];
        } else {
            throw new RangeError('not supported');
        }
        return clip;
    },
    'tag': (): TagJson[] => [
        { id: 1, name: 'tag 1', best: 2, parent: [17], type: 'Studio', description: 'foo description 1' },
        { id: 2, name: 'tag 2', best: 2, parent: [], type: 'Content', description: 'foo description 2' },
        { id: 3, name: 'tag 3', best: 7, parent: [], type: 'Content', description: 'foo description 3' },
        { id: 4, name: 'tag 4', best: 3333, parent: [], type: 'Format', description: 'foo description 4' },
        { id: 5, name: 'tag 5', best: 0, parent: [2], type: 'Content', description: 'foo description 5' },
        { id: 6, name: 'tag 6', best: 0, parent: [2], type: 'Content', description: 'foo description 6' },
        { id: 7, name: 'tag 7', best: 0, parent: [], type: 'Studio', description: 'foo description 7' },
        { id: 8, name: 'tag 8', best: 2, parent: [], type: 'Content', description: 'foo description 8' },
        { id: 9, name: 'tag 9', best: 3, parent: [8], type: 'Content', description: 'foo description 9' },
        { id: 10, name: 'tag 10', best: 3, parent: [], type: 'Format', description: 'foo description a' },
        { id: 11, name: 'tag 11', best: 0, parent: [7], type: 'Studio', description: 'foo description b' },
        { id: 12, name: 'tag 12', best: 0, parent: [], type: 'Special', description: 'foo description c' },
        { id: 13, name: 'tag 13', best: 3333, parent: [3], type: 'Studio', description: 'foo description d' },
        { id: 14, name: 'tag 14', best: 3, parent: [9, 6], type: 'Content', description: 'foo description e' },
        { id: 15, name: 'tag 15', best: 3, parent: [13, 6], type: 'Content', description: 'foo description f' },
        { id: 16, name: 'tag 16', best: 0, parent: [1], type: 'Studio', description: 'now we get an overflow' },
        { id: 17, name: 'tag 17', best: 0, parent: [], type: 'Studio', description: 'now we get another overflow' },
    ],
    'tag/create': () => {
        const id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
        return { id };
    },
    'tag/edit': () => null,
    'tag/setbest': () => null,
    'clip/autocrawl': () => {
        const newLcg = new Lcg(BigInt(Date.now()));
        const disappeared = fakeClips.filter(_ => newLcg.nextFloat() < 0.0025).map(item => item[1]);
        const added = [];
        const numberOfAppeared = Math.exp(newLcg.nextFloat() * 5) - 100;
        for (let i = 0; i < numberOfAppeared; i++) {
            added.push(toPath(newLcg.nextI31()));
        }
        return { disappeared, added };
    },
    'clip/history': params => {
        const newLcg = new Lcg(BigInt(params.id) * 214013n + 2531011n);
        const numbers = Math.exp(newLcg.nextFloat() * 5) - 5;
        const times = [];
        for (let i = 0, cur = Date.now() / 1000; i < numbers; i++) {
            cur -= Math.exp(10 * newLcg.nextFloat()) * 1000;
            times.push(cur);
        }
        return times;
    },
    'clip/similar': () => {
        return [
            { clipId: 7, total: 15, scores: { 'a': 3, 'b': 7, 'c': 5 } },
            { clipId: 5, total: 11, scores: { 'a': 4, 'b': 2, 'c': 5 } },
            { clipId: 13, total: 5, scores: { 'a': 3, 'c': 2 } },
            { clipId: 11, total: 1, scores: { 'a': 1 } }
        ];
    },
    'clip/thumb': params => fetch(`images/${((params.id % 10) - -1)}.jpg`).then(res => res.blob()),
    'players': () => ['test_player', 'mplayer', 'gplayer']
};

export const handle = (api: string, params?: { [key: string]: any }): Promise<any> => {
    return new Promise((res, rej) => {
        const mapper = FAKE_RESULTS[api];
        console.log(`API ${api} called with ${JSON.stringify(params ?? null)}.`);
        if (!mapper) { rej(`API ${api} not mocked!`); } else { setTimeout(() => res(mapper(params!)), 1000); }
    }).catch(e => {
        globalToast(`Mock API error: ${e}`);
        throw e;
    });
}