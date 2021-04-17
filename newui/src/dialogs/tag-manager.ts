import { LitElement, css } from 'lit-element/lit-element.js';
import { property } from 'lit-element/decorators/property.js';
import { html } from '../components/registry';
import { Clip, clips, tags } from '../data';
import { PopupBase, globalDialog, AvctCtxMenuHook, globalPopupMenu, popupClosed, noOp } from '../components/dialog';
import { asyncReplace } from 'lit-html/directives/async-replace.js';
import { ClipId, MultiStore, TagJson, TagType, TAG_TYPES } from '../model';
import { AvctTable, column } from '../components/table';
import { AvctClipPlay } from '../menus/clip-play';
import { AvctTagList, searchTags } from '../tags';
import { MAX_GOOD_INTEGER, simpleStat } from '../components/utils';
import { sendTypedApi } from '../api';
import { globalToast } from '../components/toast';
import { AvctClipTagAutoUpdateDialog, ClipAutoUpdateTask } from './clip-tag-auto-update';
import { AvctTextEdit } from '../menus/text-edit';

abstract class TagCellElementBase extends LitElement {
    @property({ type: Boolean, reflect: true })
    loading = false;

    @property({ attribute: false })
    row!: TagJson;

    td(): HTMLTableDataCellElement {
        const td = this.parentNode as HTMLElement;
        if (td.nodeName.toUpperCase() !== 'TD') { throw new TypeError('Not used as a cell.'); }
        return td as HTMLTableDataCellElement;
    }

    render(): ReturnType<LitElement['render']> {
        return html`
            <link rel="stylesheet" href="./shared.css" />
            ${this.renderContent()}
        `;
    }

    abstract renderContent(): ReturnType<LitElement['render']>;
}

abstract class AvctTagNameOrDescription extends TagCellElementBase {
    protected abstract fieldName: 'name' | 'description';

    private edit = false;

    private startEdit(e: MouseEvent): void { 
        if (this.edit) { return; }
        this.edit = true;
        globalPopupMenu({
            title: `Edit ${this.fieldName}`,
            type: AvctTextEdit,
            params: this.row[this.fieldName],
            cancellable: false
        }, e)
        .then(
            this.done, 
            popupClosed(dirty => { if (dirty) { globalToast(`Tag ${this.fieldName} editor discarded.`); }})
        )
        .finally(() => { this.edit = false; });
    }

    private readonly done = async (detail: string): Promise<void> => { 
        try {
            this.loading = true;
            await this.executeActualUpdate(detail);
        } finally {
            this.loading = false;
        }
    };
    
    protected async executeActualUpdate(newValue: string): Promise<void> {
        await sendTypedApi('!tag/$/edit', { id: this.row.id, key: this.fieldName, value: newValue });
        tags.update(MultiStore.mapUpdater(this.row.id, { ...this.row, [this.fieldName]: newValue }, this.row));
    }

    renderContent(): ReturnType<LitElement['render']> {
        return html`
            ${this.row[this.fieldName]}
            <button part="td-hover" class="round-button" @click="${this.startEdit}">✎</button>
        `;
    }
}

class AvctTagName extends AvctTagNameOrDescription {
    protected fieldName = 'name' as const;
}

class AvctTagTypeSelector extends PopupBase<TagType, TagType> {
    static styles = css`
        :host {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            column-gap: 8px;
        }
    `;

    private selectType(e: Event): void {
        const radio = e.target as HTMLInputElement;
        if (!radio.checked) { return; }
        this.done(radio.value as TagType);
    }

    render() {
        return html`${TAG_TYPES.map(type => html`<label><input type="radio" name="tag-type" value="${type}" @click="${this.selectType}" ?checked="${type == this.params}" />${type}</label>`)}`;
    }   
}

class AvctTagType extends TagCellElementBase {
    private edit = false;

    private startEdit(e: MouseEvent): void { 
        if (this.edit) { return; }
        this.edit = true;
        globalPopupMenu({
            title: `Edit tag type`,
            type: AvctTagTypeSelector,
            params: this.row.type
        }, e)
        .then(this.selectType, noOp)
        .finally(() => { this.edit = false; });
    }
    
    private readonly selectType = async (destination: TagType): Promise<void> => {
        this.loading = true;
        try {
            await sendTypedApi('!tag/$/edit', { id: this.row.id, key: 'type', value: destination });
            tags.update(MultiStore.mapUpdater(this.row.id, { ...this.row, type: destination }, this.row));
        } finally {
            this.loading = false;
        }
    };

    renderContent(): ReturnType<LitElement['render']> {
        return html`
            <span class="tag-chip tag-type-${this.row.type.toLowerCase()}">${this.row.type}</span>
            <button part="td-hover" class="round-button" @click="${this.startEdit}">✎</button>
        `;
    }
}

class AvctTagDescription extends AvctTagNameOrDescription {
    protected fieldName = 'description' as const;
}

class AvctTagBest extends TagCellElementBase {
    renderContent(): ReturnType<LitElement['render']> {
        return this.row.best ? asyncReplace(clips.value(), clipsMap => {
            const clipObj = this.row.best ? (clipsMap as Map<ClipId, Clip>).get(this.row.best) : void 0;
            if (!clipObj) { return `(error: clip ${this.row.best} not found)`; }
            return html`${clipObj.getFile()}<${AvctCtxMenuHook} .title="Play ${clipObj.getFile()}" .factory="${AvctClipPlay}" .params="${{ clipId: clipObj.id, path: clipObj.path, insideSpecial: true }}"></${AvctCtxMenuHook}>`;
        }) : '(not set)';
    }
}

class AvctTagStat extends TagCellElementBase {
    renderContent(): ReturnType<LitElement['render']> {
        const tagId = this.row.id;
        return asyncReplace(clips.value(), clipsMap => {
            const relevantClips = Array.from((clipsMap as Map<number, Clip>).values()).filter(clip => clip.tags.has(tagId));
            if (!relevantClips.length) { return 'not used in any clips'; }
            const scores = relevantClips.map(item => item.score).filter(score => score);
            const scoreText = scores.length ? (
                ((scores.length === relevantClips.length) ? '' : `(${(scores.length)} rated) `) + simpleStat(scores)
            ) : 'none has a rating';
            return html`used in ${relevantClips.length} clips; ${scoreText}`;
        });
    }
}
const autoUpdate = async (tagId?: number): Promise<void> => {
    const [{ value: clipsMap }, { value: tagsMap }] = await Promise.all([
        clips.value().next(),
        tags.value().next()
    ] as const);
    const ancestorsCache = new Map<number, number[]>();
    const ancestorsOf = (tag: number): number[] => {
        const cached = ancestorsCache.get(tag);
        if (cached) { return cached; }
        const parents = tagsMap.get(tag)!.parent;
        const ancestors = parents.map(parentId => ancestorsOf(parentId));
        const result = Array.from(new Set(parents.concat(...ancestors)));
        ancestorsCache.set(tag, result);
        return result;
    };
    let clipsToBeInspected = Array.from(clipsMap.values());
    if (tagId) { 
        clipsToBeInspected = clipsToBeInspected.filter(clip => clip.tags.has(tagId));
    }
    const updates: ClipAutoUpdateTask[] = [];
    for (const clip of clipsToBeInspected) {
        const expectedTags = Array.from(new Set(Array.from(clip.tags).concat(...Array.from(clip.tags, ancestorsOf))));
        if (expectedTags.length != clip.tags.size) {
            updates.push({
                clip, newTags: expectedTags, changedTags: expectedTags.filter(id => !clip.tags.has(id)).map(id => tagsMap.get(id)!)
            });
        }
    }
    if (!updates.length) {
        if (!tagId) { globalToast('No mismatches detected.'); }
        return;
    }
    try {
        await globalDialog({ title: 'Clip tag matching', cancellable: false, type: AvctClipTagAutoUpdateDialog, params: updates });
    } catch (e) {
        globalToast('Clip with wrong tags are NOT corrected.');
    }
};

class AvctTagParent extends TagCellElementBase {
    private removeTag(e: CustomEvent<number>): Promise<void> {
        return this.setParentTags(this.row.parent.filter(id => id !== e.detail));
    }

    private selectTag(e: CustomEvent<number>): Promise<void> {
        return this.setParentTags(this.row.parent.concat(e.detail));
    }

    private async setParentTags(parent: number[]): Promise<void> {
        try {
            this.loading = true;
            await sendTypedApi('!tag/$/parent', { id: this.row.id, parent });
            tags.update(MultiStore.mapUpdater(this.row.id, { ...this.row, parent }, this.row));
            autoUpdate(this.row.id);
        } finally {
            this.loading = false;
        }
    }

    renderContent(): ReturnType<LitElement['render']> {
        return html`<${AvctTagList} .tags="${asyncReplace(tags.value(), tagsMap => this.row.parent.map(id => (tagsMap as Map<number, TagJson>).get(id)))}" @avct-select="${this.selectTag}" @avct-remove="${this.removeTag}" allowCreation></${AvctTagList}>`;
    }
}

class AvctTagChildren extends TagCellElementBase {
    static styles = css`
        a { color: inherit; text-decoration: none; }
    `;

    private goToTag(e: Event): void {
        const id = (e.target as HTMLElement).dataset['tagId']!;
        const sibling = AvctTable.getSibling(e.target as HTMLElement, parseInt(id));
        if (sibling) {
            sibling.scrollIntoView();
        } else {
            globalToast('Tag not visible due to text filter.');
        }
    } 

    renderContent(): ReturnType<LitElement['render']> {
        const tagId = this.row.id;
        return asyncReplace(tags.value(), tagsMap => {
            const children = Array.from((tagsMap as Map<number, TagJson>).values()).filter(tag => tag.parent.includes(tagId));
            return children.map(child => html`<a href="javascript:void(0)" data-tag-id="${child.id}" @click="${this.goToTag}" class="tag-chip ${'tag-type-' + child.type.toLowerCase()}">${child.name}</a>`);
        });
    }
}

export class AvctClipHistoryDialogInner extends LitElement {
    static styles = css`
        :host { display: flex; flex-direction: column; overflow: hidden; padding: 0; }
        header { border-bottom: 1px solid #e0e0e9; padding-bottom: 12px; display: flex; flex-direction: row; }
        header input { flex-grow: 1; margin-right: 8px; }
    `;

    @property({ attribute: false })
    tags?: Map<number, TagJson>;

    @property({ attribute: false })
    search = '';

    // Purely-derived property. No need to check.
    rows: TagJson[] | null = null;

    update(changedProps: Map<keyof AvctClipHistoryDialogInner, any>): ReturnType<LitElement['update']> {
        if ((changedProps.has('tags') || changedProps.has('search')) && this.tags) {
            this.rows = searchTags(this.tags, this.search);
        }
        return super.update(changedProps);
    }

    private static readonly columns = [
        column('Name', AvctTagName),
        column('Type', AvctTagType),
        column('Description', AvctTagDescription),
        column('Best', AvctTagBest, false),
        column('Stat', AvctTagStat, false),
        column('Parent', AvctTagParent),
        column('Child', AvctTagChildren),
    ];

    private updateSearchText(e: Event): void {
        this.search = (e.target as HTMLInputElement).value;
    }

    private checkForAutoUpdate(): Promise<void> {
        return autoUpdate();
    }

    render(): ReturnType<LitElement['render']> {
        if (!this.rows) {
            return html`Loading...`;
        }
        return html`
            <link rel="stylesheet" href="./shared.css" />
            <header>
                <input type="text" placeholder="Search..." value="${this.search}" @input="${this.updateSearchText}" />
                <button @click="${this.checkForAutoUpdate}">Check</button>
            </header>
            <${AvctTable}
                .rows="${this.rows}"
                .defaultColumns="${AvctClipHistoryDialogInner.columns}"
                .visibleRows="${MAX_GOOD_INTEGER}">
            </${AvctTable}>`;
    }
}

export class AvctTagManagerDialog extends PopupBase<void, void> {
    static styles = css`
        :host { display: flex; }
    `;

    render(): ReturnType<LitElement['render']> {
        return html`
            <${AvctClipHistoryDialogInner} .tags="${asyncReplace(tags.value())}"></${AvctClipHistoryDialogInner}>
        `;
    }
}
