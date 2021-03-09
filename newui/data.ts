import { send } from './api';
import { TagJson, ClipCallback, RowData, ClipJson, DedupeStore, Store, MultiStore, mapNonEq, Race, Role, RACES } from './model';
import { AvctClipRaceElementKey, AvctClipRoleElementKey, AvctClipScoreElementKey, AvctClipTagsElementKey } from './registry';

export const tags: MultiStore<Map<number, TagJson>> = new MultiStore(send('tag/list').then((raw: TagJson[]) => new Map(raw.map(tagJson => [tagJson.id, tagJson]))));

export const clips: MultiStore<Map<number, Clip>> = new MultiStore(
    Promise.all([tags.value().next().then(res => res.value), send('clip/list')]).then(
        ([tags, raw]: [Map<number, TagJson>, ClipJson[]]) => new Map(raw.map(clipJson => [clipJson[0], new Clip(clipJson, tags)])))
);

export const players: Store<string[]> = new Store(send('players'));

export class Clip implements RowData {
    readonly id: number;
    readonly path: string;
    readonly data: ClipJson;
    readonly race: Race;
    readonly roles: Role[];
    readonly score: number;
    readonly tags: number[];
    readonly note: string;
    exists = true;
    thumbImgPromise: Promise<Blob> | undefined;

    constructor(data: ClipJson, tagsData: Map<number, TagJson>) {
        this.id = data[0];
        this.path = data[1];
        this.race = data[2];
        this.roles = data[3];
        this.score = data[4];
        this.tags = data[7];
        this.note = data[11];

        this.data = data;
        this.validate(tagsData);
    }

    getFile(): string { return this.path.split('/').pop()!; }

    private changeRequested = false;

    async update(key: string, value: any, from: ClipCallback): Promise<void> {
        if (this.changeRequested) {
            alert('Another change is already pending!');
            return;
        }
        from.loading = true;
        try {
            const json = await send('clip/edit', { id: this.id, key, value });
            const tagsData = (await tags.value().next()).value;
            clips.update(oldMap => {
                const newMap = new Map(oldMap);
                newMap.set(this.id, new Clip(json, tagsData));
                return newMap;
            });
        } finally {
            from.loading = false;
        }
    }

    errors: Map<string, string[]> | null = null;

    validate(tags: Map<number, TagJson>): void {
        const errors = new Map<string, string[]>();

        if (this.score <= 0) {
            errors.set(AvctClipScoreElementKey, ['No rating']);
        }

        const tagEntities = this.tags.map(id => tags.get(id));
        const tagErrors = [];
        if (!tagEntities.find(tag => tag?.type === 'Studio')) {
            tagErrors.push('No studio');
        }
        if (!tagEntities.find(tag => tag?.type === 'Content')) {
            tagErrors.push('No content tag');
        }
        if (tagErrors.length) { errors.set(AvctClipTagsElementKey, tagErrors); }

        if (RACES.indexOf(this.race) <= 0) {
            errors.set(AvctClipRaceElementKey, ['Not set']);
        }

        if (!this.roles.length) {
            errors.set(AvctClipRoleElementKey, ['Not set']);
        }

        const out = errors.size > 0 ? errors : null;
        this.errors = out;
    }
}