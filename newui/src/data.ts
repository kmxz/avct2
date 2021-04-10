import { sendTypedApi } from './api';
import { globalDialog, noOp } from './components/dialog';
import { AvctClipsUpdates } from './dialogs/clips-updates';
import { AvctClipName, AvctClipRace, AvctClipRole, AvctClipScore, AvctClipTags, AvctClipThumb, ClipCellElementBase } from './clips';
import { TagJson, RowData, ClipJson, MultiStore, Race, Role, RACES } from './model';
import { ElementType } from './components/registry';

const tagListReq = sendTypedApi('tag');
const clipListReq = sendTypedApi('clip');

export const tags: MultiStore<Map<number, TagJson>> = new MultiStore(tagListReq.then(raw => new Map(raw.map(tagJson => [tagJson.id, tagJson]))));

export const clips: MultiStore<Map<number, Clip>> = new MultiStore(
    Promise.all([
        tags.value().next(), 
        clipListReq
    ] as const).then(
        ([tagsIter, raw]) => new Map(raw.map(clipJson => [clipJson[0], new Clip(clipJson, tagsIter.value)]))
    )
);

export const players: Promise<string[]> = sendTypedApi('players');

Promise.all([tagListReq, clipListReq]).then(() => sendTypedApi('!clip/autocrawl')).then(async response => {
    const tagsData = (await tags.value().next()).value;
    if (response.disappeared.length) {
        const disappearedFiles = new Set(response.disappeared);
        clips.update(oldMap => new Map(Array.from(oldMap.entries(), entry => {
            if (disappearedFiles.has(entry[1].path)) {
                return [entry[0], entry[1].clone({ exists: false }, tagsData)];
            } else {
                return entry;
            }
        })));
    }
    if (response.disappeared.length || response.added.length) {
        globalDialog({ title: 'Clip files changed', type: AvctClipsUpdates, params: response }).catch(noOp);
    }
});

export class Clip implements RowData {
    readonly id: number;
    readonly path: string;
    readonly race: Race;
    readonly roles: Role[];
    readonly score: number;
    readonly duration: number;
    readonly tags: Set<number>;
    readonly totalPlay: number;
    readonly lastPlay: number;
    readonly hasThumb: boolean;
    readonly note: string;
    readonly resolution: number;

    readonly exists: boolean;
    thumbImgPromise: Promise<string> | undefined;

    constructor(data: ClipJson, tagsData: Map<number, TagJson>, oldInstance?: Clip) {
        if (oldInstance) {
            Object.assign(this, oldInstance);
        }
        this.id = data[0];
        this.path = data[1];
        this.race = data[2];
        this.roles = data[3];
        this.score = data[4];
        this.duration = data[6];
        this.tags = new Set(data[7]);
        this.totalPlay = data[8];
        this.lastPlay = data[9];
        this.hasThumb = data[10];
        this.note = data[11];
        this.resolution = data[12];
        this.exists = true;
        this.validate(tagsData);
    }

    clone(updates: Partial<Clip>, tagsData: Map<number, TagJson>): Clip {
        const newInstance = Object.assign(Object.create(Clip.prototype) as Clip, this, updates);
        newInstance.validate(tagsData);
        return newInstance;
    }

    getThumb(): Promise<string> {
        if (!this.hasThumb) { throw new TypeError(`Thumb not set for clip ${this.id}.`); }
        if (!this.thumbImgPromise) {
            this.thumbImgPromise = sendTypedApi('clip/$/thumb', { id: this.id }).then((blob: Blob) => URL.createObjectURL(blob));
        }
        return this.thumbImgPromise;
    }

    getFile(): string { return this.path.split('/').pop()!; }

    getLastPlayText(): string | null {
        if (!this.lastPlay) { return null; }
        const diffDays = (new Date().getTime() / 1000 - this.lastPlay) / (3600 * 24);
        return ((diffDays > 10) ? String(Math.round(diffDays)) : diffDays.toPrecision(2)) + ' days ago';
    }

    private changeRequested = false;

    async update(key: string, value: number | string | number[] | string[], from?: ClipCellElementBase): Promise<void> {
        if (this.changeRequested) {
            alert('Another change is already pending!');
            return;
        }
        const logLabel = `Updating ${key} of ${this.getFile()}`;
        if (from) { from.loading = true; }
        console.time(logLabel);
        try {
            const json = await sendTypedApi('!clip/$/edit', { id: this.id, key, value });
            const tagsData = (await tags.value().next()).value;
            if (from) { from.row.sortedBy.freeze(from.row); }
            clips.update(MultiStore.mapUpdater(this.id, new Clip(json, tagsData, this), this));
        } finally {
            if (from) { from.loading = false; }
            console.timeEnd(logLabel);
        }
    }

    errors: Map<ElementType, string[]> | null = null;

    validate(tags: Map<number, TagJson>): void {
        const errors = new Map<ElementType, string[]>();

        if (!this.exists) {
            errors.set(AvctClipName, ['File not exists']);
        }

        if (!this.hasThumb) {
            errors.set(AvctClipThumb, ['Thumb unset']);
        }

        if (this.score <= 0) {
            errors.set(AvctClipScore, ['No rating']);
        }

        const tagEntities = Array.from(this.tags, id => tags.get(id));
        const tagErrors = [];
        if (!tagEntities.find(tag => tag?.type === 'Studio')) {
            tagErrors.push('No studio');
        }
        if (!tagEntities.find(tag => tag?.type === 'Content')) {
            tagErrors.push('No content tag');
        }
        if (tagErrors.length) { errors.set(AvctClipTags, tagErrors); }

        if (RACES.indexOf(this.race) <= 0) {
            errors.set(AvctClipRace, ['Not set']);
        }

        if (!this.roles.length) {
            errors.set(AvctClipRole, ['Not set']);
        }

        const out = errors.size > 0 ? errors : null;
        this.errors = out;
    }

    async notifyThumbChange(): Promise<void> {
        const tagsData = (await tags.value().next()).value;
        clips.update(MultiStore.mapUpdater(this.id, this.clone({ thumbImgPromise: undefined, hasThumb: true }, tagsData), this));
    }
}