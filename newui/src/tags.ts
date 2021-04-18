import { LitElement, css, PropertyValues } from 'lit-element/lit-element.js';
import { html } from './components/registry';
import { property } from 'lit-element/decorators/property.js';
import { arrayNonEq, MultiStore, TagJson, TagType, TAG_TYPES } from './model';
import { globalToast } from './components/toast';
import { query } from 'lit-element/decorators/query.js';
import { tags } from './data';
import { sendTypedApi } from './api';
import { classMap } from 'lit-html/directives/class-map.js';
import { MAX_GOOD_INTEGER } from './components/utils';
import { AvctCtxMenuHook, globalDialog, globalPopupMenu, PopupBase, popupClosed } from './components/dialog';
import { AvctBestOfTagDialog } from './dialogs/best-of-tag';

const sortOrder: Record<TagType, number> = {
    'Studio': 1, 'Content': 2, 'Format': 3, 'Special': 4
};

const normalize = (input: string): string => input.toLowerCase().replace(/\s+/g, ' ').trim();

const matchTagValue = (tagName: string, description: string | undefined, normalizedInput: string): number => {
    const normalizedTagName = normalize(tagName);
    if (normalizedTagName === normalizedInput) {
        return MAX_GOOD_INTEGER;
    } else if (normalizedTagName.startsWith(normalizedInput)) {
        return MAX_GOOD_INTEGER - normalizedTagName.length;
    } else if (normalizedTagName.indexOf(normalizedInput) >= 0) {
        return (MAX_GOOD_INTEGER >> 1) - normalizedTagName.length;
    } else if (description) {
        const normalizedDescription = normalize(description);
        if (normalizedDescription.indexOf(normalizedInput) >= 0) {
            return 0 - normalizedDescription.length;
        }
    }
    return -MAX_GOOD_INTEGER;
};

export const searchTags = (allTags: TagJson[], inputValue: string): TagJson[] => {
    const normalizedInput = normalize(inputValue);
    return allTags
        .map(tag => [tag, matchTagValue(tag.name, tag.description, normalizedInput)] as const)
        .filter(entry => entry[1] > -MAX_GOOD_INTEGER)
        .sort((a, b) => (b[1] - a[1]) || (a[0].name.localeCompare(b[0].name)))
        .map(entry => entry[0]);
};

export class AvctTagSelect extends PopupBase<{ existing: Set<number>, allowCreation: boolean }, number> {
    static styles = css`
        .anchor {
            position: relative;
        }
        input[type="text"], ul, button {
            box-sizing: border-box;
            width: 180px;
        }
        ul {
            position: absolute;
            top: 100%;
            left: 0;
            max-height: 180px;
            overflow-y: auto;
            margin: 0;
            padding: 0;
            background: #fff;
            z-index: 1;
            border: 1px solid #e0e0e9;
        }
        li {
            padding: 4px 6px;
            user-select: none;
        }
        li.selected {
            background: #E8EAF6;
        }
        li > .primary {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
        }
        li > .primary > span { 
            min-width: 0;
            text-overflow: ellipsis;
            overflow: hidden;
        }
        li > .primary > small {
            font-size: 12px;
            display: inline-block;
            line-height: 18px;
            border-radius: 9px;
            padding: 0 4px;
            margin-left: 2px;
            opacity: 0.75;
        }
        li > .secondary {
            font-size: 12px;
            opacity: 0.75;
            text-overflow: ellipsis;
            overflow: hidden;
        }
        li.selected > .primary > small {
            opacity: 1;
        }
        .types {
            display: grid;
            grid-template-columns: 1fr 1fr;
            column-gap: 8px;
        }
        .creation {
            margin: 4px 0;
        }
    `;

    get existing(): Set<number> { return this.params.existing; }
    get allowCreation(): boolean { return this.params.allowCreation; }

    @property({ attribute: false, hasChanged: arrayNonEq() })
    hintTags?: TagJson[];

    @property({ attribute: false })
    highlightedHintTag = -1;

    @property({ attribute: false })
    tagCreationInProgress = false;

    @property({ attribute: false })
    selectedTag?: Pick<TagJson, 'id' | 'type' | 'name'>;

    private async updateCandidates(e: Event): Promise<void> {
        const inputValue = (e.target as HTMLInputElement).value;
        const allTags = (await tags.value().next()).value;
        const matchedTags = searchTags(Array.from(allTags.values()), inputValue);
        if (matchedTags.length && (matchedTags[0].name === inputValue)) { // Before normalization!
            this.selectedTag = matchedTags[0];
        } else {
            this.selectedTag = void 0;
        }
        this.hintTags = matchedTags;
        this.highlightedHintTag = 0;
    }

    private hideCandidates(): void {
        this.hintTags = void 0;
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) { return; }
        if (!this.hintTags) {
            if (e.code === 'Enter' || e.code === 'NumpadEnter') { 
                this.emit();
                e.preventDefault();
            } else if (e.code === 'Escape') {
                this.abort();
                e.preventDefault();
            }
            return;
        }
        switch (e.code) {
            case 'Escape':
                this.hintTags = void 0; 
                break;
            case 'ArrowUp':
                this.highlightedHintTag = (this.highlightedHintTag - 1 + this.hintTags.length) % this.hintTags.length;
                break;
            case 'ArrowDown':
                this.highlightedHintTag = (this.highlightedHintTag + 1) % this.hintTags.length;
                break;
            case 'Enter':
            case 'NumpadEnter':
                this.selectHint(this.highlightedHintTag);
                break;
            default:
                return;
        }
        e.preventDefault();
    }

    @query('input')
    input!: HTMLInputElement;
    
    firstUpdated(): ReturnType<LitElement['firstUpdated']> { this.input.focus(); }

    @query('li.selected')
    selectedLi!: HTMLLIElement | null;

    private selectType(e: Event): void {
        const radio = e.target as HTMLInputElement;
        if (!radio.checked) { return; }
        if (this.selectedTag?.id) { return; }
        this.selectedTag = {
            id: 0,
            name: this.input.value!.trim(),
            type: radio.value as TagType
        };
    }

    private async emit(): Promise<void> {
        if (!this.selectedTag) { return; }
        const { name, type } = this.selectedTag;
        let id = this.selectedTag.id;
        if (!id) {
            this.tagCreationInProgress = true;
            const newTag = await sendTypedApi('!tag/create', { name, type });
            id = newTag['id'];
            tags.update(MultiStore.mapUpdater<number, TagJson>(id, { id, name, type, best: 0, parent: [], description: '' }, void 0));
            this.tagCreationInProgress = false;
        }
        this.done(id);
    }

    private getSelectedLiIdex(e: MouseEvent): number {
        const li = e.currentTarget as HTMLLIElement;
        const children = Array.from(li.parentNode!.children);
        return children.indexOf(li);
    }

    private liClick(e: MouseEvent): void {
        this.selectHint(this.getSelectedLiIdex(e));
    }

    private selectHint(index: number): void {
        const tag = this.hintTags![index];
        if (!tag) { return; }
        this.selectedTag = tag;
        this.input.value = tag.name;
        this.hintTags = void 0;
    }

    private noMouseSteal(e: MouseEvent): void {
        e.preventDefault(); // https://stackoverflow.com/a/57630197
    }

    private mouseHover(e: MouseEvent): void {
        this.highlightedHintTag = this.getSelectedLiIdex(e);
    }

    updated(): ReturnType<LitElement['updated']> {
        const li = this.selectedLi;
        if (!li) { return; }
        const bcr = li.getBoundingClientRect();
        const ul = li.parentNode as HTMLUListElement;
        const ulBcr = ul.getBoundingClientRect();
        if (bcr.top < ulBcr.top) {
            ul.scrollBy(0, bcr.top - ulBcr.top);
        } else if (bcr.bottom > ulBcr.bottom) {
            ul.scrollBy(0, bcr.bottom - ulBcr.bottom);
        }
    }

    render(): ReturnType<LitElement['render']> {
        return html`
            <link rel="stylesheet" href="./shared.css" />
            <div class="anchor">
                <input type="text" @input="${this.updateCandidates}" @focus="${this.updateCandidates}" @blur="${this.hideCandidates}" @keydown="${this.handleKeyDown}" ?disabled="${this.tagCreationInProgress}" />
                <ul>
                    ${this.hintTags?.map((tag, index) =>
                        html`<li class="${classMap({ 'selected': index === this.highlightedHintTag })}" @click="${this.liClick}" @mousedown="${this.noMouseSteal}" title="${tag.name}" @mouseenter="${this.mouseHover}">
                            <div class="primary">
                                <span title="${tag.name}">${tag.name}</span>
                                <small class="tag-type-${tag.type.toLowerCase()}">${tag.type}</small>
                            </div>
                            ${tag.description ? html`<div class="secondary" title="${tag.description}">${tag.description}</div>` : null}
                        </li>`
                    )}
                </ul>
            </div>
            <div class="creation">
                ${this.selectedTag?.id ? (
                    this.existing.has(this.selectedTag.id) ? html`Tag already added.` : html`An existing ${this.selectedTag.type} tag.`
                ) : (
                    (this.input?.value ?? '').trim().length ? (this.allowCreation ? html`
                        Create a new tag?
                        <div class="types">
                            ${TAG_TYPES.map(type => html`<label><input type="radio" name="tag-type" value="${type}" @click="${this.selectType}" ?disabled="${this.tagCreationInProgress}" />${type}</label>`)}
                        </div>
                    ` : `Such tag does not exist.`) : 'Tag name cannot be empty.'
                )}
            </div>
            <button @click="${this.emit}" ?loading="${this.tagCreationInProgress}" ?disabled="${this.tagCreationInProgress || !this.selectedTag}">Done</button>
        `;
    }
}

type TagAction = 'remove' | 'best';

class AvctSingleTagPopup extends PopupBase<{ name: string; description: string; clipContext: boolean; }, TagAction> {
    static styles = css`:host { white-space: normal; }`;

    private clickHandler(e: Event): void { this.done((e.currentTarget as HTMLButtonElement).value as TagAction); }

    render(): ReturnType<LitElement['render']> {
        return html`
            <link rel="stylesheet" href="./shared.css" />
            <button @click="${this.clickHandler}" value="remove">Remove</button>
            <hr /><b>${this.params.name}</b>: ${this.params.description}
            ${this.params.clipContext ? html`<hr /><button @click="${this.clickHandler}" value="best">Set as best</button>` : null}
        `;
    }
}

export class AvctTagList extends LitElement {
    @property({ attribute: false })
    tags: TagJson[] = [];

    createRenderRoot(): ReturnType<LitElement['createRenderRoot']> { return this; }

    @property({ type: Boolean })
    allowCreation!: boolean;

    @property({ attribute: false })
    clipContext?: number;

    private tagIds: Set<number> = new Set();

    update(changedParams: PropertyValues): ReturnType<LitElement['updated']> {
        if (changedParams.has('tags')) {
            this.tagIds = new Set(this.tags.map(tag => tag.id));
        }
        super.update(changedParams);
    }

    private removeTag(id: number): void { 
        const tagElement = this.tags.find(tag => tag.id === id);
        if (window.confirm(`Remove tag ${tagElement?.name ?? '[unknown]'}?`)) {
            this.dispatchEvent(new CustomEvent<number>('avct-remove', { detail: id }));
        }
    }

    private async setBest(id: number): Promise<void> {
        const tag = this.tags.find(tag => tag.id === id)!;
        const clip = this.clipContext!;
        const updated = await globalDialog({ title: `Best of tag ${tag.name}`, type: AvctBestOfTagDialog, params: { tag: id, clip } }).catch(popupClosed(() => false));
        if (updated) {
            await sendTypedApi('!tag/$/setbest', { id, clip });
            tags.update(MultiStore.mapUpdater(id, { ...tag, best: clip }, tag));
        }
    }

    private add = false;

    private onAddTag(e: MouseEvent): void { 
        if (this.add) { return; }
        this.add = true;
        globalPopupMenu({
            title: 'Add a tag',
            type: AvctTagSelect,
            params: { existing: this.tagIds, allowCreation: this.allowCreation }
        }, e)
        .then(
            detail => this.dispatchEvent(new CustomEvent<number>('avct-select', { detail })), 
            popupClosed(() => globalToast('Tag selection discarded.'))
        )
        .finally(() => { this.add = false; });
    }

    private clickedButtonInMenu(e: CustomEvent<TagAction>): void {
        const button = e.target as HTMLElement;
        const id = parseInt(button.dataset['tagId']!);
        if (isNaN(id)) { globalToast('Not a valid tag.'); }
        if (e.detail === 'best') { 
            this.setBest(id);
        } else if (e.detail === 'remove') {
            this.removeTag(id);
        }
    }

    render(): ReturnType<LitElement['render']> {
        this.tags.sort((a, b) => {
            const byType = sortOrder[a.type] - sortOrder[b.type];
            return byType || (a.name.localeCompare(b.name));
        });
        return html`${
            this.tags.map(tag => html`
                <span class="${classMap({
                    'tag-chip': true, 'ctx-menu-host': true, ['tag-type-' + tag.type.toLowerCase()]: true, 'tag-best': tag.best === this.clipContext 
                })}">
                    ${tag.name}
                    <${AvctCtxMenuHook} .title="${tag.type} tag" .factory="${AvctSingleTagPopup}" .params="${{
                        name: tag.name, description: tag.description, clipContext: this.clipContext
                    }}" data-tag-id="${String(tag.id)}" @avct-select="${this.clickedButtonInMenu}">
                    </${AvctCtxMenuHook}>
                </span>
            `)}
            <button part="td-hover" class="round-button" @click="${this.onAddTag}">+</button>
        `;
    }
}

export class AvctTagListSimple extends LitElement {
    static styles = css`
        :host { position: relative; }
    `;

    @property({ attribute: false })
    tags: TagJson[] = [];

    private async addTag(e: CustomEvent<number>): Promise<void> {
        const allTags = (await tags.value().next()).value;
        if (this.tags.some(tag => tag.id === e.detail)) { return; }
        const matching = allTags.get(e.detail)!;
        this.dispatchEvent(new CustomEvent<TagJson[]>('avct-bubble-change', { detail: [...this.tags, matching], bubbles: true }));
    }

    private removeTag(e: CustomEvent<number>): void {
        const newTags = this.tags.filter(tag => tag.id !== e.detail);
        if (newTags.length === this.tags.length) { return; }
        this.dispatchEvent(new CustomEvent<TagJson[]>('avct-bubble-change', { detail: newTags, bubbles: true }));
    }

    render() {
        return html`
            <link rel="stylesheet" href="./shared.css" />
            <${AvctTagList} .tags="${this.tags}" @avct-select="${this.addTag}" @avct-remove="${this.removeTag}"></${AvctTagList}>
        `;
    }

}