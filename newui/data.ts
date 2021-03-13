import { send } from './api';
import { globalDialog } from './components/dialog';
import { TagJson, ClipCallback, RowData, ClipJson, Store, MultiStore, Race, Role, RACES } from './model';
import { AvctClipNameElementKey, AvctClipRaceElementKey, AvctClipRoleElementKey, AvctClipScoreElementKey, AvctClipTagsElementKey, AvctClipUpdatesDialog } from './registry';

const tagListReq = send('tag/list');
const clipListReq = send('clip/list');

export const tags: MultiStore<Map<number, TagJson>> = new MultiStore(tagListReq.then((raw: TagJson[]) => new Map(raw.map(tagJson => [tagJson.id, tagJson]))));

export const clips: MultiStore<Map<number, Clip>> = new MultiStore(
    Promise.all([tags.value().next().then(res => res.value), clipListReq]).then(
        ([tags, raw]: [Map<number, TagJson>, ClipJson[]]) => new Map(raw.map(clipJson => [clipJson[0], new Clip(clipJson, tags)])))
);

Promise.all([tagListReq, clipListReq]).then(() => send('clip/autocrawl')).then(async (response: { added: string[], disappeared: string[] }) => {
    const tagsData = (await tags.value().next()).value;
    if (response.disappeared.length) {
        const disappearedFiles = new Set(response.disappeared);
        clips.update(oldMap => {
            const newMap = new Map(Array.from(oldMap.entries()).map(entry => {
                if (disappearedFiles.has(entry[1].path)) {
                    return [entry[0], entry[1].clone({ exists: false }, tagsData)];
                } else {
                    return entry;
                }
            }));
            return newMap;
        });
    }
    if (response.disappeared.length || response.added.length) {
        globalDialog({ title: 'Clip files changed', type: AvctClipUpdatesDialog, params: response });
    }
});

export const players: Store<string[]> = new Store(send('players'));

export class Clip implements RowData {
    readonly id: number;
    readonly path: string;
    readonly race: Race;
    readonly roles: Role[];
    readonly score: number;
    readonly tags: number[];
    readonly note: string;
    readonly exists: boolean;
    readonly thumbImgPromise: Promise<Blob> | undefined;

    constructor(data: ClipJson, tagsData: Map<number, TagJson>) {
        this.id = data[0];
        this.path = data[1];
        this.race = data[2];
        this.roles = data[3];
        this.score = data[4];
        this.tags = data[7];
        this.note = data[11];

        this.exists = true;
        this.validate(tagsData);
    }

    clone(updates: Partial<Clip>, tagsData: Map<number, TagJson>): Clip {
        const newInstance = Object.assign(Object.create(Clip.prototype) as Clip, this, updates);
        newInstance.validate(tagsData);
        return newInstance;
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

        if (!this.exists) {
            errors.set(AvctClipNameElementKey, ['File not exists']);
        }

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