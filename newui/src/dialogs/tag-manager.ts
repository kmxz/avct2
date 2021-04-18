import { LitElement, css } from 'lit-element/lit-element.js';
import { property } from 'lit-element/decorators/property.js';
import { html } from '../components/registry';
import { Clip, clips, tags } from '../data';
import { PopupBase, globalDialog, AvctCtxMenuHook, globalPopupMenu, popupClosed, noOp } from '../components/dialog';
import { asyncReplace } from 'lit-html/directives/async-replace.js';
import { styleMap } from 'lit-html/directives/style-map.js';
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

class AvctTagStatPlot extends PopupBase<ReturnType<typeof simpleStat>, void> {
    static styles = css`
        .container {
            display: flex;
            align-items: flex-end;
        }
        .container div {
            width: 28px;
            margin: 0 4px;
            line-height: 18px;
            border-top: 0 solid #9a23a1;
            text-align: center;
        }
    `;

    render(): ReturnType<LitElement['render']> {
        const scores = [this.params.r1, this.params.r2, this.params.r3, this.params.r4, this.params.r5];
        const max = Math.max(...scores);
        return html`
            <div class="container">
                ${scores.map((number, index) => 
                    html`<div title="${number} clips" style="${styleMap({ borderTopWidth: `${number / max * 120}px` })}">${index + 1}★</div>`
                )}
            </div>
        `;
    }
}

class AvctTagStat extends TagCellElementBase {
    private static renderStat(stats: ReturnType<typeof simpleStat>): string {
        const scoreText = stats.rated ? (
            (stats.rated === stats.num) ? '' : ` (${(stats.rated)} rated)`
        ) : ', none has a rating';
        let scoreDetails = '';
        if (stats.rated) {
            const nice = stats.r4 / 2 + stats.r5;
            const nicePercentage = nice / stats.rated * 100;
            scoreDetails += `; avg ${stats.avg.toFixed(1)}; nice ${nice} (${Math.round(nicePercentage)}%)`;
        }
        return `${stats.num} clips${scoreText}${scoreDetails}`;
    }

    renderContent(): ReturnType<LitElement['render']> {
        const tagId = this.row.id;
        return asyncReplace(clips.value(), clipsMap => {
            const relevantClips = Array.from((clipsMap as Map<number, Clip>).values()).filter(clip => clip.tags.has(tagId));
            if (!relevantClips.length) { return 'not used in any clips'; }
            const stats = simpleStat(relevantClips.map(item => item.score));
            return html`${AvctTagStat.renderStat(stats)}<${AvctCtxMenuHook} .title="Distribution" .factory="${AvctTagStatPlot}" .params="${stats}"></${AvctCtxMenuHook}>`;
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

class AvctTagSortingSyntaxHelp extends PopupBase<void, void> {
    static styles = css`
        :host { white-space: normal; }
        code { display: inline-block; margin: 0 2px; border-bottom: 1px dotted #999; }
    `;

    render(): ReturnType<LitElement['render']> {
        return html`An number expression with variables: ${Object.keys(simpleStat([])).map(item => html`<code>${item}</code>`)}.`;
    }
}

export class AvctTagManagerDialogInner extends LitElement {
    static styles = css`
        :host { display: flex; flex-direction: column; overflow: hidden; padding: 0; }
        header { border-bottom: 1px solid #e0e0e9; padding-bottom: 6px; }
        header > * { display: flex; margin-bottom: 6px; justify-content: space-between; }
        .search { flex-grow: 1; margin-right: 8px; }
        form input { margin: 0; }
        form label { margin-right: 6px; }
        .right { text-align: right; }
        .right input { width: 100px; }
        .right small { display: block; color: #c00; }
    `;

    @property({ attribute: false })
    tags?: Map<number, TagJson>;

    @property({ attribute: false })
    search = '';

    @property({ attribute: false })
    filterByType?: TagType;

    @property({ attribute: false })
    sortingFormula = 'num';

    // Purely-derived property. No need to check.
    sortingFormulaFunction?: ((stats: ReturnType<typeof simpleStat>) => number);

    // Purely-derived property. No need to check.
    sortingFormulaError?: string;

    @property({ attribute: false })
    rows?: TagJson[];

    constructor() {
        super();
        this.updateSortingFormulaImpl();
    }

    update(changedProps: Map<keyof AvctTagManagerDialogInner, any>): ReturnType<LitElement['update']> {
        let sortNeeded = false;
        if (changedProps.has('sortingFormula')) {
            this.updateSortingFormulaImpl();
            sortNeeded = true;
        }
        if ((changedProps.has('tags') || changedProps.has('search') || changedProps.has('filterByType')) && this.tags) {
            const tags = Array.from(this.tags.values());
            this.rows = searchTags(this.filterByType ? tags.filter(tag => tag.type === this.filterByType) : tags, this.search);
            sortNeeded = true;
        }
        if (sortNeeded) {
            this.scheduleDeferredSort();
        }
        return super.update(changedProps);
    }

    private async scheduleDeferredSort(): Promise<void> {
        const scorer = this.sortingFormulaFunction;
        if (!scorer) { return; }
        const clipsMap = (await clips.value().next()).value;
        this.rows = this.rows?.map(tag => {
            const relevantClips = Array.from((clipsMap as Map<number, Clip>).values()).filter(clip => clip.tags.has(tag.id));
            const stat = simpleStat(relevantClips.map(clip => clip.score));
            const score = scorer(stat);
            return [tag, isNaN(score) ? Number.NEGATIVE_INFINITY : score] as const;
        })?.sort((a, b) => b[1] - a[1])?.map(pair => pair[0]);
    }

    private static readonly columns = [
        column('Name', AvctTagName),
        column('Type', AvctTagType),
        column('Description', AvctTagDescription),
        column('Best', AvctTagBest, false),
        column('Stat', AvctTagStat),
        column('Parent', AvctTagParent),
        column('Child', AvctTagChildren),
    ];

    private updateSearchText(e: Event): void {
        this.search = (e.target as HTMLInputElement).value;
    }

    private checkForAutoUpdate(): Promise<void> {
        return autoUpdate();
    }

    private selectFilterByType(e: Event): void {
        const input = e.currentTarget as HTMLInputElement;
        if (!input.checked) { return; }
        this.filterByType = (input.value as TagType) || void 0;
    }

    private updateSortingFormulaImpl(): void {
        const sortingFormula = this.sortingFormula;
        if (!sortingFormula) {
            this.sortingFormulaError = void 0;
            this.sortingFormulaFunction = void 0;
            return;
        }

        const attempt = simpleStat([1, 2, 3, 4, 5]);
        const keys = Object.keys(attempt) as (keyof ReturnType<typeof simpleStat>)[];

        const tokens = sortingFormula.split(/\+|-|\*|\/|\(|\)|\s/).filter(str => str.length);
        for (const token of tokens) {
            if (/^\d+(\.\d+)?$/.test(token)) { continue; } // number literal.
            if ((keys as string[]).includes(token)) { continue; } // parameter name.
            this.sortingFormulaError = `Illegal symbol ${token}`;
            return;
        }

        let wrappedOutputFunction, response;
        try {
            const outputFunction = new Function(...keys, `return (${sortingFormula})`);
            wrappedOutputFunction = (stat: ReturnType<typeof simpleStat>): number => outputFunction(...keys.map(key => stat[key]));
            response = wrappedOutputFunction(attempt);
        } catch (e) {
            this.sortingFormulaError = `${e}`;
            return;
        }
        if (typeof response !== 'number') {
            this.sortingFormulaError = `Sorting output ${response} is not a number.`;
            return;
        }

        this.sortingFormulaError = void 0;
        this.sortingFormulaFunction = wrappedOutputFunction;
    }

    private updateSortingFormula(e: Event): void {
        this.sortingFormula = (e.currentTarget as HTMLInputElement).value;
    }

    render(): ReturnType<LitElement['render']> {
        if (!this.rows) {
            return html`Loading...`;
        }
        return html`
            <link rel="stylesheet" href="./shared.css" />
            <header>
                <div>
                    <input class="search" type="text" placeholder="Search..." value="${this.search}" @input="${this.updateSearchText}" />
                    <button @click="${this.checkForAutoUpdate}">Check</button>
                </div>
                <div>
                    <form>
                        <label><input type="radio" name="filter-by-type" @click="${this.selectFilterByType}" value="" checked /> All</label>
                        ${TAG_TYPES.map(item => html`<label><input type="radio" name="filter-by-type" value="${item}" @click="${this.selectFilterByType}" /> ${item}</label>`)}
                    </form>
                    <div class="right">
                        <span class="ctx-menu-host">Sorting (?)<${AvctCtxMenuHook} .factory="${AvctTagSortingSyntaxHelp}" .title="Help"></${AvctCtxMenuHook}></span>
                        <input placeholder="Default to alphabetical" value="${this.sortingFormula}" @change="${this.updateSortingFormula}" />
                        ${this.sortingFormulaError ? html`<small>${this.sortingFormulaError}</small>` : null}
                    </div>
                </div>
            </header>
            <${AvctTable}
                .rows="${this.rows}"
                .defaultColumns="${AvctTagManagerDialogInner.columns}"
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
            <${AvctTagManagerDialogInner} .tags="${asyncReplace(tags.value())}"></${AvctTagManagerDialogInner}>
        `;
    }
}
