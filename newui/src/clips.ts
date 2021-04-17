import { AvctTable, column } from './components/table';
import { LitElement, TemplateResult, css } from 'lit-element/lit-element.js';
import { html } from './components/registry';
import { property } from 'lit-element/decorators/property.js';
import { TagJson, EditingCallback, RowData, recordNonEq } from './model';
import { tags, Clip, clips } from './data';
import { asyncReplace } from 'lit-html/directives/async-replace.js';
import { until } from 'lit-html/directives/until.js';
import { classMap } from 'lit-html/directives/class-map.js';
import { globalToast } from './components/toast';
import { AvctCtxMenuHook, globalDialog, globalPopupMenu, noOp, popupClosed } from './components/dialog';
import { AvctClipPlay } from './menus/clip-play';
import { QuickjerkScore } from './menus/quickjerk-score';
import { AvctRaceSelection } from './menus/race-selection';
import { AvctRoleSelection } from './menus/role-selection';
import { AvctTextEdit } from './menus/text-edit';
import { AvctTagList } from './tags';
import { AvctClipHistoryDialog } from './dialogs/clip-history';
import { AvctThumbnailDialog } from './dialogs/thumbnail';
import { SortModel } from './quickjerk-mechanism';
import { sendTypedApi } from './api';
import { styleMap } from 'lit-html/directives/style-map.js';
import { live } from 'lit-html/directives/live.js';
import { bisect, bsearchDesc } from './components/utils';
import { query } from '@lit/reactive-element/decorators/query.js';

export interface SortedClip extends RowData {
    clip: Clip;
    rating: number;
    sortedBy: QuickjerkProxy;
}

export abstract class ClipCellElementBase extends LitElement implements EditingCallback {
    static styles = css`
        :host {
            user-select: none;
        }

        .error {
            background: #d32f2f;
            font-size: 12px;
            color: #fff;
            display: inline-block;
            line-height: 18px;
            height: 18px;
            border-radius: 9px;
            padding: 0 6px;
            margin: 2px;
        }

        .error::before { content: '⚠ '; }
    `;

    @property({ attribute: false })
    row!: SortedClip;

    get item(): Clip { return this.row.clip; }

    @property({ type: Boolean, reflect: true })
    loading = false;
    
    td(): HTMLTableDataCellElement {
        const td = this.parentNode as HTMLElement;
        if (td.nodeName.toUpperCase() !== 'TD') { throw new TypeError('Not used as a cell.'); }
        return td as HTMLTableDataCellElement;
    }

    render(): ReturnType<LitElement['render']> {
        console.debug(`Rendering ${this.tagName} for ${this.item.id}`);
        const errors = this.item.errors?.get(this.constructor as any);
        return html`
            <link rel="stylesheet" href="./shared.css" />
            ${this.renderContent()}
            ${errors?.map(item => html`<span class="error">${item}</span>`)}
        `;
    }

    abstract renderContent(): TemplateResult | string;
}

export class AvctClipThumb extends ClipCellElementBase {
    static get styles() {
        return [
            super.styles,
            css`img { max-width: 100%; }`
        ];
    };

    constructor() {
        super();
        this.addEventListener('click', async () => {
            let blob: Blob;
            try {
                blob = await globalDialog({
                    title: 'Select thumbnail',
                    type: AvctThumbnailDialog,
                    params: {
                        id: this.item.id,
                        thumb: this.item.hasThumb ? this.item.getThumb() : null
                    }
                });
            } catch (e) {
                globalToast('Thumb not changed.');
                return;
            }
            await sendTypedApi('!clip/$/saveshot', { 'id': this.item.id, 'file': blob });
            await this.item.notifyThumbChange();
        });
    }

    renderContent(): TemplateResult {
        return html`${this.item.hasThumb ? until(this.item.getThumb().then(str => html`<img src="${str}" />`), html`<span loading></span>`) : null}`;
    }
}

export class AvctClipName extends ClipCellElementBase {
    static get styles() {
        return [
            super.styles,
            css`
                :host {
                    overflow-wrap: break-word;
                }
                .resolution-indicator {
                    border-radius: 50%;
                    display: inline-block;
                    width: 12px;
                    height: 12px;
                    vertical-align: middle;
                }
            `
        ];
    };

    private async onDeleteClip(): Promise<void> {
        try {    
            this.loading = true;
            await sendTypedApi('!clip/$/delete', { id: this.item.id });
            clips.update(tagsMap => {
                const newMap = new Map(tagsMap);
                newMap.delete(this.item.id);
                return newMap;
            });
        } finally {
            this.loading = false;
        }
    }

    private static resolutionToColor(resolution: number): string { return resolution ? 'hsl(' + (Math.pow(Math.min(Math.max(0, (resolution - 160)) / 1280, 1), 2 / 3) * 120) + ', 100%, 50%)' : '#000'; }

    renderContent(): TemplateResult {
        return html`
            <span class="resolution-indicator" title="${this.item.resolution + 'p'}" style="${styleMap({ 'background': AvctClipName.resolutionToColor(this.item.resolution) })}"></span>
            ${this.item.getFile()}
            ${this.item.exists ? html`<${AvctCtxMenuHook} .title="Play ${this.item.getFile()}" .factory="${AvctClipPlay}" .params="${{ clipId: this.item.id, path: this.item.path, insideSpecial: false }}"></${AvctCtxMenuHook}>` : html`<button class="round-button" @click="${this.onDeleteClip}">🗑</button>`}
        `;
    }
}

export class AvctClipRace extends ClipCellElementBase {
    static get styles() {
        return [
            super.styles,
            css`.round-button { margin-left: 4px; }`
        ];
    };

    private edit = false;

    private startEdit(e: MouseEvent): void { 
        if (this.edit) { return; }
        this.edit = true;
        globalPopupMenu({
            title: 'Edit race',
            type: AvctRaceSelection,
            params: this.item.race
        }, e)
        .then(result => this.item.update('race', result, this), noOp)
        .finally(() => { this.edit = false; });
    }

    renderContent(): TemplateResult {
        return html`
            ${this.item.race}
            <button part="td-hover" class="round-button" @click="${this.startEdit}">✎</button>`;
    }
}

export class AvctClipRole extends ClipCellElementBase {
    private edit = false;

    private startEdit(e: MouseEvent): void { 
        if (this.edit) { return; }
        this.edit = true;
        globalPopupMenu({
            title: 'Edit roles',
            type: AvctRoleSelection,
            params: this.item.roles,
        }, e)
        .then(
            result => this.item.update('role', result, this), 
            popupClosed(dirty => { if (dirty) { globalToast('Role editor discarded.'); }})
        )
        .finally(() => { this.edit = false; });
    }

    renderContent(): TemplateResult {
        return html`
            ${this.item.roles.map(role => html`<span class="tag-chip">${role}</span>`)}
            <button part="td-hover" class="round-button" @click="${this.startEdit}">✎</button>
        `;
    }
}

export class AvctClipNote extends ClipCellElementBase {
    private edit = false;

    private startEdit(e: MouseEvent): void { 
        if (this.edit) { return; }
        this.edit = true;
        globalPopupMenu({
            title: 'Edit Source note',
            type: AvctTextEdit,
            params: this.item.note,
            cancellable: false
        }, e)
        .then(
            result => this.item.update('sourceNote', result, this), 
            popupClosed(dirty => { if (dirty) { globalToast('Source note editor discarded.'); }})
        )
        .finally(() => { this.edit = false; });
    }

    renderContent(): TemplateResult {
        return html`
            ${this.item.note}
            <button part="td-hover" class="round-button" @click="${this.startEdit}">✎</button>
        `;
    }
}

export class AvctClipTags extends ClipCellElementBase {
    static get styles() {
        return [
            super.styles,
            css`.tag-best::before { content: '★'; margin-right: -2px; opacity: 0.5; }`
        ];
    };

    private removeTag(e: CustomEvent<number>): Promise<void> {
        const newTags = Array.from(this.item.tags).filter(id => id !== e.detail);
        return this.item.update('tags', newTags, this);
    }

    private selectTag(e: CustomEvent<number>): Promise<void> {
        const newTags = Array.from(this.item.tags).concat(e.detail);
        return this.item.update('tags', newTags, this);
    }

    renderContent(): TemplateResult {
        return html`<${AvctTagList} .tags="${asyncReplace(tags.value(), tagMap => Array.from(this.item.tags, id => (tagMap as Map<number, TagJson>).get(id)))}" @avct-select="${this.selectTag}" @avct-remove="${this.removeTag}" allowCreation .clipContext="${this.item.id}"></${AvctTagList}>`;
    }
}

export class AvctClipScore extends ClipCellElementBase {
    static get styles() {
        return [
            super.styles,
            css`
                button, button:hover, :active {
                    background: none; border: 0 none; padding: 0; margin: 0; cursor: pointer; box-shadow: none;
                }
                
                button.preview {
                    color: #4E1379;
                    text-shadow: 0 1px 1px #9a23a1;
                }
            `
        ];
    };

    @property({ attribute: false })
    preview = 0;

    private static targetScore(e: MouseEvent): number {
        if ((e.target as Node).nodeName.toUpperCase() !== 'BUTTON') { return 0; }
        const star = e.target as HTMLButtonElement;
        return parseInt(star.value);
    }

    private async handleClick(e: MouseEvent): Promise<void> {
        const score = AvctClipScore.targetScore(e);
        if (score > 0) {
            await this.item.update('grade', score, this);
            this.preview = 0;
        }
    }

    private handleMouseOver(e: MouseEvent): void {
        const score = AvctClipScore.targetScore(e);
        if (score > 0) {
            this.preview = score;
        }
    }

    private handleMouseOut(e: MouseEvent): void {
        if (AvctClipScore.targetScore(e) > 0) {
            this.preview = 0;
        }
    }
    
    renderContent(): TemplateResult {
        const rating = this.item.score;
        return html`<div @click="${this.handleClick}" @mouseover="${this.handleMouseOver}" @mouseout="${this.handleMouseOut}">${Array.from(Array(5).keys()).map(index => 
            html`<button class="${classMap({ 'preview': this.preview > index })}" value="${String(index + 1)}">${(rating > index) ? '★' : '☆'}</button>`
        )}</div>`;
    }
}

class AvctClipHistory extends ClipCellElementBase {
    private popupView(): void {
        globalDialog({ type: AvctClipHistoryDialog, params: this.item.id, title: 'History' }).catch(noOp);
    }

    renderContent(): TemplateResult {
        if (!this.item.lastPlay) { return html`Never played`; }
        const diffDays = (new Date().getTime() / 1000 - this.item.lastPlay) / (3600 * 24);
        return html`${this.item.totalPlay} times (${this.item.getLastPlayText()}) <button part="td-hover" class="round-button" @click="${this.popupView}">⏲</button>`;
    }
}

class AvctClipDuration extends ClipCellElementBase {
    renderContent(): string {
        const duration = this.item.duration;
        if (duration < 60) { return duration + 's'; }
        const minutes = Math.floor(duration / 60);
        return `${minutes} m ${duration - 60 * minutes} s`
    }
}

class AvctClipSorting extends ClipCellElementBase {
    renderContent(): TemplateResult {
        return html`
            ${this.row.rating.toFixed(2)}
            <${AvctCtxMenuHook} .factory="${QuickjerkScore}" .params="${this.row}"></${AvctCtxMenuHook}>
        `;
    }
}

export type ScoreThresholdData = {
    thresholdAtScore: number;
    clipsVisible: number;
    clipsTotal: number;
};

export class QuickjerkScoreControl extends LitElement {
    @property({ attribute: false, hasChanged: recordNonEq() })    
    scoreThresholdData?: ScoreThresholdData;

    createRenderRoot(): ReturnType<LitElement['createRenderRoot']> { return this; }

    private static round(num: number): string {
        if (num % 1 === 0) { return num.toString(); }
        return num.toFixed(2);
    }

    private thresholdInput(e: Event): void {
        const threshold = parseFloat((e.target as HTMLInputElement).value);
        this.dispatchEvent(new CustomEvent<number>('avct-select', { detail: threshold }));
    }

    render(): ReturnType<LitElement['render']> {
        if (!this.scoreThresholdData || isNaN(this.scoreThresholdData.thresholdAtScore)) { return null; }
        return html`
            <span>
                Showing scores > <input type="number" .value="${live(QuickjerkScoreControl.round(this.scoreThresholdData.thresholdAtScore))}" style="max-width: 60px" @input="${this.thresholdInput}" /> (${this.scoreThresholdData.clipsVisible} of ${this.scoreThresholdData.clipsTotal})
            </span>
        `;
    }
}

class QuickjerkProxy {
    readonly freeze: (clip: SortedClip) => void;
    private readonly qj: SortModel;
    private readonly frozenClip?: { clipId: number; score: number; };

    constructor(clips: AvctClips) {
        this.freeze = clip => { clips.frozenClip = { clipId: clip.id, score: clip.rating }; };
        this.qj = clips.quickjerk;
        this.frozenClip = clips.frozenClip;
    }

    score(clip: Clip): ReturnType<SortModel['score']> {
        if (this.frozenClip?.clipId === clip.id) {
            return this.frozenClip.score;
        }
        return this.qj.score(clip);
    }

    scoreForDetail(clip: Clip): ReturnType<SortModel['scoreForDetail']> {
        const raw = this.qj.scoreForDetail(clip);
        if (this.frozenClip?.clipId === clip.id) {
            return raw.concat({
                weight: 1, message: 'Temporary frozen since just edited', name: 'Frozen', score: this.frozenClip.score 
            });
        } else {
            return raw;
        }
    }
}

export class AvctClips extends LitElement {
    @property({ attribute: false })
    clips?: Map<number, Clip>;

    // Purely-derived property. No need to check.
    rowsAfterThresholding: SortedClip[] = [];

    @property({ attribute: false })
    quickjerk!: SortModel;
    
    @property({ attribute: false })
    scoreThreshold!: number;

    // A clip that will stay in the original position despite it's score changes.
    // This is needed as we don't want a clip to move while being edited.
    @property({ attribute: false })
    frozenClip?: { clipId: number; score: number; };

    // Cache sorting output to:
    // - Prevent recomputation.
    // - Ensure same instances are returned so no rerendering will be triggered.
    private readonly rowInstancesCache = new Map<number, SortedClip>();

    rows: SortedClip[] = [];

    private applySorting(): void {
        const sortedBy = new QuickjerkProxy(this);
        this.rows = Array.from(this.clips?.values() ?? [], clip => {
            const old = this.rowInstancesCache.get(clip.id);
            if (old?.clip === clip) { return old; }
            const sortedClip: SortedClip = {
                clip, rating: sortedBy.score(clip), sortedBy, id: clip.id
            };
            this.rowInstancesCache.set(clip.id, sortedClip);
            return sortedClip;
        }).sort((a, b) => b.rating - a.rating);
    }
    
    private emitStats(sortModelChanged: boolean): void {
        const scores = this.rows.map(item => item.rating);
        if (!Number.isFinite(this.scoreThreshold) || sortModelChanged) {
            const clipsVisible = bisect(scores);
            const splitAtScore = (clipsVisible < scores.length) ? (scores[clipsVisible - 1] + scores[clipsVisible]) / 2 : Number.NEGATIVE_INFINITY;
            this.scoreThreshold = splitAtScore;
        }
    }

    private applyThreshold(): void {
        const clipsVisible = bsearchDesc(this.rows, 'rating', this.scoreThreshold);
        this.rowsAfterThresholding = this.rows.slice(0, clipsVisible);
        const defaultSc: ScoreThresholdData = { clipsTotal: this.rows.length, clipsVisible, thresholdAtScore: this.scoreThreshold };
        this.dispatchEvent(new CustomEvent<ScoreThresholdData>('avct-score-control', { detail: defaultSc }));
    }

    @query('#clips-table')
    clipsTable?: AvctTable<SortedClip>;

    update(changedProps: Map<keyof AvctClips, any>): ReturnType<LitElement['update']> {
        const sortModelChanged = changedProps.has('quickjerk');
        const frozenClipChanged = changedProps.has('frozenClip');
        if (sortModelChanged) {
            this.rowInstancesCache.clear();
            this.clipsTable?.resetRowLimit();
            if (!frozenClipChanged) {
                this.frozenClip = void 0; // Won't trigger another update, but that's fine.
            }
        } else if (frozenClipChanged) {
            const old = changedProps.get('frozenClip') as AvctClips['frozenClip'];
            if (old) { this.rowInstancesCache.delete(old.clipId); }
            if (this.frozenClip) { this.rowInstancesCache.delete(this.frozenClip.clipId); }
        }
        if (changedProps.has('clips') || sortModelChanged || frozenClipChanged) {
            this.applySorting();
            this.emitStats(sortModelChanged);
            this.applyThreshold();
        } else if (changedProps.has('scoreThreshold')) {
            this.applyThreshold();
        }
        return super.update(changedProps);
    }

    updated(): ReturnType<LitElement['updated']> {
        requestAnimationFrame(now => {
            console.debug(`<${this.tagName}> render finished @${now}`);
        });
    }

    createRenderRoot(): ReturnType<LitElement['createRenderRoot']> { return this; }

    private static readonly columns = [
        column('Thumb', AvctClipThumb, 120),
        column('Name', AvctClipName, 120),
        column('Rating', AvctClipScore, 35),
        column('Roles', AvctClipRole, 35),
        column('Race', AvctClipRace, 35),
        column('Tags', AvctClipTags, 150),
        column('Note', AvctClipNote, 80),
        column('History', AvctClipHistory, false),
        column('Duration', AvctClipDuration, false),
        column('Rank', AvctClipSorting, 35)
    ];

    render(): ReturnType<LitElement['render']> {
        if (!this.clips) {
            return html`Loading...`;
        }
        return html`
            <${AvctTable}
                id="clips-table"
                .rows="${this.rowsAfterThresholding}"
                .defaultColumns="${AvctClips.columns}">
            </${AvctTable}>`;
    }
}
