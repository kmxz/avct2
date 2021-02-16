const RACES = ['Unknown', 'Chinese', 'Other Asian', 'Other races'] as const;
const ROLES = ['Vanilla', 'M self', 'F self', 'M/m', 'M/f', 'F/m', 'F/f', 'MtF/m'] as const;

export type Race = typeof RACES[number];
export type Role = typeof ROLES[number];

interface ClipJson {
    readonly id: number;
    readonly duration: number;
    readonly grade: number;
    readonly lastPlay: number;
    readonly totalPlay: number;
    readonly path: string;
    readonly race: Race;
    readonly role: Role[];
    readonly size: number;
    readonly sourceNote: string;
    readonly tags: number[];
    readonly thumbSet: boolean;
    readonly resolution: number;
}

export class Clip {
    data: ClipJson;
    readonly file: string;
    exists: boolean = true;
    thumbImgPromise: Promise<Blob> | null;

    jerkScore: number = 0;
    jerkEntries: QjResultEntry[];

    constructor(data: ClipJson) {
        this.data = data;
        this.file = data.path.split('/').pop();
    }
}

export class Tag {
    readonly id: number;
    readonly name: string;
}

export class QjCriterion {
    weight: number = 1;
    constructor(public readonly name: string, public readonly calc: (clip: Clip) => { score: number, message: string }) {}

    doCalc(clip: Clip) {
        const result = this.calc(clip);
        return new QjResultEntry(this, result.score, result.message);
    }
}

class QjResultEntry {
    readonly weightedScore: number;

    constructor(public readonly criterion: QjCriterion, public readonly score: number, public readonly message: string) {
        this.weightedScore = score * criterion.weight;
    }
}