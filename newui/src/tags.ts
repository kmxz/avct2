import { LitElement, css, PropertyValues } from 'lit-element/lit-element.js';
import { html } from './components/registry';
import { property } from 'lit-element/decorators/property.js';
import { arrayNonEq, MultiStore, TagJson, TagType, TAG_TYPES } from './model';
import { globalToast } from './components/toast';
import { query } from 'lit-element/decorators/query.js';
import { tags } from './data';
import { sendTypedApi } from './api';
import { AvctCtxMenu } from './components/menu';
import { classMap } from 'lit-html/directives/class-map.js';
import { MAX_GOOD_INTEGER } from './components/utils';

const sortOrder: Record<TagType, number> = {
    'Studio': 1, 'Content': 2, 'Format': 3, 'Special': 4
};

const normalize = (input: string): string => input.toLowerCase().replace(/\s+/g, ' ').trim();

export class AvctTagSelect extends LitElement {
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
            border: 1px solid #F5F5F5;
        }
        li {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            padding: 4px 6px;
        }
        li.selected {
            background: #E8EAF6;
        }
        li > span {
            color: #757575;
        }
        li > span > span {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 4px;
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

    @property({ attribute: false })
    existing!: Set<number>;

    @property({ attribute: false, hasChanged: arrayNonEq() })
    hintTags?: TagJson[];

    @property({ attribute: false })
    highlightedHintTag = -1;

    @property({ attribute: false })
    tagCreationInProgress = false;

    @property({ attribute: false })
    allowCreation = true;

    @property({ attribute: false })
    selectedTag?: Pick<TagJson, 'id' | 'type' | 'name'>;

    private static matchTagValue(tagName: string, normalizedInput: string): number {
        const normalizedTagName = normalize(tagName);
        if (normalizedTagName === normalizedInput) {
            return MAX_GOOD_INTEGER;
        } else if (normalizedTagName.startsWith(normalizedInput)) {
            return MAX_GOOD_INTEGER - normalizedTagName.length;
        } else if (normalizedTagName.indexOf(normalizedInput) >= 0) {
            return 0 - normalizedTagName.length;
        }
        return Number.MIN_SAFE_INTEGER;
    }

    private async updateCandidates(e: Event): Promise<void> {
        const inputValue = (e.target as HTMLInputElement).value;
        const normalizedInput = normalize(inputValue);
        const allTags = (await tags.value().next()).value;
        const matchedTags = Array.from(allTags.values()).map(tag => [
            tag,
            AvctTagSelect.matchTagValue(tag.name, normalizedInput)
        ] as const).filter(entry => entry[1] > Number.MIN_SAFE_INTEGER).sort((a, b) => (b[1] - a[1]) || (a[0].name.localeCompare(b[0].name)));
        if (matchedTags.length && (matchedTags[0][0].name === inputValue)) { // Before normalization!
            this.selectedTag = matchedTags[0][0];
        } else {
            this.selectedTag = void 0;
        }
        this.hintTags = matchedTags.map(entry => entry[0]);
        this.highlightedHintTag = 0;
    }

    private hideCandidates(): void {
        this.hintTags = void 0;
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) { return; }
        if (!this.hintTags) {
            if (e.code === 'Enter') { 
                this.emit();
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
                this.selectHint(this.highlightedHintTag);
                break;
            default:
                return;
        }
        e.preventDefault();
    }

    @query('input')
    input!: HTMLInputElement;

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
            tags.update(MultiStore.mapUpdater<number, TagJson>(id, { id, name, type, best: 0, parent: [], description: '' }));
            this.tagCreationInProgress = false;
        }
        this.dispatchEvent(new CustomEvent<number>('avct-select', { detail: id }));
    }

    private liClick(e: Event): void {
        const li = e.currentTarget as HTMLLIElement;
        const children = Array.from(li.parentNode!.children);
        const index = children.indexOf(li);
        this.selectHint(index);
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
                        html`<li class="${classMap({ 'selected': index === this.highlightedHintTag })}" @click="${this.liClick}" @mousedown="${this.noMouseSteal}">${tag.name}<span><span class="tag-type-${tag.type.toLowerCase()}"></span>${tag.type}</span></li>`
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

export class AvctTagList extends LitElement {
    @property({ attribute: false })
    tags: TagJson[] = [];

    createRenderRoot(): ReturnType<LitElement['createRenderRoot']> { return this; }

    @property({ attribute: false })
    add = false;

    @property({ type: Boolean })
    allowCreation!: boolean;

    private tagIds: Set<number> = new Set();

    update(changedParams: PropertyValues): ReturnType<LitElement['updated']> {
        if (changedParams.has('tags')) {
            this.tagIds = new Set(this.tags.map(tag => tag.id));
        }
        super.update(changedParams);
    }

    private onAddTag(): void { this.add = true; }
    private abortAdd(): void { globalToast('Tag selection discarded.'); this.add = false; }

    private removeTag(e: MouseEvent): void { 
        const button = e.target as HTMLButtonElement;
        const id = parseInt(button.dataset['tagId']!);
        if (isNaN(id)) { globalToast('Not a valid tag.'); }
        const tagElement = this.tags.find(tag => tag.id === id);
        if (window.confirm(`Remove tag ${tagElement?.name ?? '[unknown]'}?`)) {
            this.dispatchEvent(new CustomEvent<number>('avct-remove', { detail: id }));
        }
    }

    private selectTag(e: CustomEvent<number>): void {
        this.dispatchEvent(new CustomEvent<number>('avct-select', { detail: e.detail }));
        this.add = false;
    }

    render(): ReturnType<LitElement['render']> {
        this.tags.sort((a, b) => {
            const byType = sortOrder[a.type] - sortOrder[b.type];
            return byType || (a.name.localeCompare(b.name));
        });
        return html`${
            this.tags.map(tag => html`
                <span class="tag-chip ctx-menu-host ${'tag-type-' + tag.type.toLowerCase()}">
                    ${tag.name}
                    <${AvctCtxMenu} title="${tag.type} tag"><button @click="${this.removeTag}" data-tag-id="${String(tag.id)}">Remove</button><hr /><b>${tag.name}</b>: ${tag.description}</${AvctCtxMenu}>
                </span>
            `)}
            <button part="td-hover" class="round-button" @click="${this.onAddTag}">+</button>
            ${this.add ? html`
                <${AvctCtxMenu} shown shadow title="Add a tag" @avct-close="${this.abortAdd}">
                    <${AvctTagSelect} @avct-select="${this.selectTag}" .existing="${this.tagIds}" .allowCreation="${this.allowCreation}"></${AvctTagSelect}>
                </${AvctCtxMenu}>`
            : null}`;
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