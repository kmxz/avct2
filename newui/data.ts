import { send } from './api';
import { arrayNonEq, TagJson, ClipCallback, RowData, ClipJson, DedupeStore, Store, MultiStore, mapNonEq } from './model';
import { AvctClipScoreElementKey, AvctClipTagsElementKey } from './registry';

export const clips: Store<Map<number, Clip>> = new Store(send('clip/list').then((raw: ClipJson[]) => new Map(raw.map(clipJson => [clipJson[0], new Clip(clipJson)]))));

export const players: Store<string[]> = new Store(send('players'));

export const tags: MultiStore<Map<number, TagJson>> = new MultiStore(send('tag/list').then((raw: TagJson[]) => new Map(raw.map(tagJson => [tagJson.id, tagJson]))));

export class Clip implements RowData {
    id: number;
    data: ClipJson;
    exists = true;
    thumbImgPromise: Promise<Blob> | undefined;
    version = 0;

    constructor(data: ClipJson) {
        this.id = data[0];
        this.data = data;
    }

    getRating(): number { return this.data[4]; }
    setRating(grade: number, from: ClipCallback): Promise<void> { return this.update('grade', grade, from); }

    getPath(): string { return this.data[1]; }

    getFile(): string { return this.getPath().split('/').pop()!; }

    getTags(): number[] { return this.data[7]; }

    private async update(key: string, value: any, from: ClipCallback): Promise<void> {
        if (from.loading) {
            alert('Another change is already pending!');
            return;
        }
        from.loading = true;
        try {
            const json = await send('clip/edit', { id: this.id, key, value });
            this.data = json;
            this.version++;
            const currentTags = (await tags.value().next()).value;
            this.validate(currentTags);
            from.rerenderAll();
        } finally {
            from.loading = false;
        }
    }

    readonly errors = new DedupeStore<Map<string, string[]> | null>(null, mapNonEq(arrayNonEq()));

    validate(tags: Map<number, TagJson>): void {
        const errors = new Map<string, string[]>();
        if (this.getRating() <= 0) {
            errors.set(AvctClipScoreElementKey, ['No rating']);
        }
        const tagEntities = this.getTags().map(id => tags.get(id));
        const tagErrors = [];
        if (!tagEntities.find(tag => tag?.type === 'Studio')) {
            tagErrors.push('No studio');
        }
        if (!tagEntities.find(tag => tag?.type === 'Content')) {
            tagErrors.push('No content tag');
        }
        if (tagErrors.length) { errors.set(AvctClipTagsElementKey, tagErrors); }
        this.errors.value(errors.size > 0 ? errors : null);
    }
}