import { ClipJson, Race, RACES, Role, ROLES, TagJson } from './model';

class Lcg {
    private static readonly a = 25214903917n;
    private static readonly c = 11n;
    private static readonly m = 2n ** 48n;
    private static readonly i31cap = (2n ** 31n) - 1n;

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
    return [
        id, toPath(lcg.nextI31()), toRace(lcg.nextFloat()), toRoles(lcg.nextI31()), toScore(lcg.nextFloat()), 5000000, 360, toTags(lcg.nextI31()), 0, 0, false, `fake clip ${id}`, toResolution(lcg.nextFloat())
    ];
};

const fakeClips: (ClipJson | null)[] = [];
const nonNull = <T>(value: T | null): value is T => (value !== null);

for (let i = 0; i < 100; i++) {
    fakeClips.push((i % 7 !== 0) ? generateFakeClip(i) : null);
}

export const FAKE_RESULTS: Record<string, (params: { [key: string]: any }) => any> = {
    'clip/list': (): ClipJson[] => fakeClips.filter(nonNull),
    'clip/edit': params => {
        const clip = fakeClips[params['id']]!;
        const indices: Record<string, number> = { 'grade': 4, 'race': 2, 'role': 3, 'tags': 7 };
        if (params['key'] in indices) {
            clip[indices[params['key']]] = params['value'];
        } else {
            throw new RangeError('not supported');
        }
        return clip;
    },
    'tag/list': (): TagJson[] => [
        { id: 1, name: 'tag 1', best: 2, parent: [], type: 'Studio' },
        { id: 2, name: 'tag 2', best: 2, parent: [], type: 'Content' },
        { id: 3, name: 'tag 3', best: 2, parent: [], type: 'Content' },
        { id: 4, name: 'tag 4', best: 2, parent: [], type: 'Format' },
        { id: 5, name: 'tag 5', best: 2, parent: [2], type: 'Content' },
        { id: 6, name: 'tag 6', best: 2, parent: [2], type: 'Content' },
        { id: 7, name: 'tag 7', best: 2, parent: [], type: 'Studio' },
        { id: 8, name: 'tag 8', best: 2, parent: [], type: 'Content' },
        { id: 9, name: 'tag 9', best: 3, parent: [8], type: 'Content' },
        { id: 10, name: 'tag 10', best: 3, parent: [], type: 'Format' },
        { id: 11, name: 'tag 11', best: 3, parent: [7], type: 'Studio' },
        { id: 12, name: 'tag 12', best: 3, parent: [], type: 'Special' },
        { id: 13, name: 'tag 13', best: 3, parent: [3], type: 'Studio' },
        { id: 14, name: 'tag 14', best: 3, parent: [9, 6], type: 'Content' },
        { id: 15, name: 'tag 15', best: 3, parent: [13, 6], type: 'Content' },
    ]
};