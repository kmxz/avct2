import { AvctTable, column } from './components/table';
import { LitElement, TemplateResult } from 'lit-element/lit-element.js';
import { html } from './components/registry';
import { property } from 'lit-element/decorators/property.js';
import { arrayNonEq, recordNonEq, TagJson, ClipCallback, Race, Role } from './model';
import { tags, Clip } from './data';
import { asyncReplace } from 'lit-html/directives/async-replace.js';
import { until } from 'lit-html/directives/until.js';
import { classMap } from 'lit-html/directives/class-map.js';
import { globalToast } from './components/toast';
import { globalDialog } from './components/dialog';
import { AvctCtxMenu } from './components/menu';
import { AvctClipPlay } from './menus/clip-play';
import { AvctRaceSelection } from './menus/race-selection';
import { AvctRoleSelection } from './menus/role-selection';
import { AvctTextEdit } from './menus/text-edit';
import { AvctTagList } from './tags';
import { AvctClipHistoryDialog } from './dialogs/clip-history';
import { AvctThumbnailDialog } from './dialogs/thumbnail';
import { SortModel } from './quickjerk-mechanism';
import { send } from './api';
import { styleMap } from 'lit-html/directives/style-map.js';

interface SortedClip {
    clip: Clip;
    rating: number;
    sortedBy: SortModel;
}

const resolutionToColor = (resolution: number): string => resolution ? 'hsl(' + (Math.pow(Math.min(Math.max(0, (resolution - 160)) / 1280, 1), 2 / 3) * 120) + ', 100%, 50%)' : '#000';

abstract class ClipCellElementBase extends LitElement implements ClipCallback {
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
        // console.log(`Rendering ${this.tagName} for ${this.item.id}`);
        const errors = this.item.errors?.get(this.constructor as any);
        return html`${this.renderContent()}${errors?.map(item => html`<span class="error">${item}</span>`)}`;
    }

    createRenderRoot() { return this; }

    abstract renderContent(): TemplateResult | string;
}

export class AvctClipThumb extends ClipCellElementBase {
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
            await send('clip/saveshot', { 'id': this.item.id, 'file': blob });
            await this.item.notifyThumbChange();
        });
    }

    renderContent(): TemplateResult {
        return html`${this.item.hasThumb ? until(this.item.getThumb().then(str => html`<img src="${str}" />`), html`<span loading></span>`) : null}`;
    }
}

export class AvctClipName extends ClipCellElementBase {
    private onDeleteClip(): void {
        send('clip/delete', { id: this.item.id });
    }

    renderContent(): TemplateResult {
        return html`
            <span class="resolution-indicator" title="${this.item.resolution + 'p'}" style="${styleMap({ 'background': resolutionToColor(this.item.resolution) })}"></span>
            ${this.item.getFile()}
            ${this.item.exists ? html`<${AvctCtxMenu} title="Play ${this.item.getFile()}"><${AvctClipPlay} .clipId="${this.item.id}" .path="${this.item.path}"></${AvctClipPlay}></${AvctCtxMenu}>` : html`<button class="round-button" @click="${this.onDeleteClip}">🗑</button>`}
        `;
    }
}

export class AvctClipRace extends ClipCellElementBase {
    @property({ attribute: false })
    edit = false;

    private startEdit(): void { this.edit = true; }
    private abortEdit(): void { this.edit = false; }
    private selects(e: CustomEvent<Race>): Promise<void> { this.edit = false; return this.item.update('race', e.detail, this); }
    
    renderContent(): TemplateResult {
        return html`
            ${this.item.race}
            <button class="td-hover round-button" @click="${this.startEdit}">✎</button>
            ${this.edit ? html`
                <${AvctCtxMenu} shown shadow title="Edit race" @avct-close="${this.abortEdit}">
                    <${AvctRaceSelection} .selected="${this.item.race}" @avct-select="${this.selects}"></${AvctRaceSelection}>
                </${AvctCtxMenu}>`
            : null}`;
    }
}

export class AvctClipRole extends ClipCellElementBase {
    @property({ attribute: false })
    edit = false;

    private dirty = false;

    private markDirty(): void { this.dirty = true; }
    private startEdit(): void { this.edit = true; this.dirty = false; }
    private abortEdit(): void { 
        if (!this.edit) { return; }
        if (this.dirty) { globalToast('Role editor discarded.'); }
        this.edit = false;
    }
    private selects(e: CustomEvent<Role[]>): Promise<void> { this.edit = false; return this.item.update('role', e.detail, this); }
    
    renderContent(): TemplateResult {
        return html`
            ${this.item.roles.map(role => html`<span>${role}</span>`)}
            <button class="td-hover round-button" @click="${this.startEdit}">✎</button>
            ${this.edit ? html`
                <${AvctCtxMenu} shown shadow title="Edit roles" @avct-close="${this.abortEdit}">
                    <${AvctRoleSelection} .selected="${this.item.roles}" @avct-touch="${this.markDirty}" @avct-select="${this.selects}"></${AvctRoleSelection}>
                </${AvctCtxMenu}>` 
            : null}
        `;
    }
}

export class AvctClipNote extends ClipCellElementBase {
    @property({ attribute: false })
    edit = false;

    private dirty = false;

    private markDirty(): void { this.dirty = true; }
    private startEdit(): void { this.edit = true; this.dirty = false; }
    private abortEdit(): void { 
        if (!this.edit) { return; }
        if (this.dirty) { globalToast('Source note editor discarded.'); }
        this.edit = false;
    }
    private done(e: CustomEvent<string>): Promise<void> { this.edit = false; return this.item.update('sourceNote', e.detail, this); }

    renderContent(): TemplateResult {
        return html`
            ${this.item.note}
            <button class="td-hover round-button" @click="${this.startEdit}">✎</button>
            ${this.edit ? html`
                <${AvctCtxMenu} shown shadow title="Edit Source note" @avct-close="${this.abortEdit}">
                    <${AvctTextEdit} value="${this.item.note}" @avct-touch="${this.markDirty}" @avct-select="${this.done}"></${AvctTextEdit}>
                </${AvctCtxMenu}>`
            : null}
        `;
    }
}

export class AvctClipTags extends ClipCellElementBase {
    private removeTag(e: CustomEvent<number>): Promise<void> {
        const newTags = this.item.tags.filter(id => id !== e.detail);
        return this.item.update('tags', newTags, this);
    }

    private selectTag(e: CustomEvent<number>): Promise<void> {
        const newTags = this.item.tags.concat(e.detail);
        return this.item.update('tags', newTags, this);
    }

    renderContent(): TemplateResult {
        return html`<${AvctTagList} .tags="${asyncReplace(tags.value(), tagMap => this.item.tags.map(id => (tagMap as Map<number, TagJson>).get(id)))}" @avct-select="${this.selectTag}" @avct-remove="${this.removeTag}"></${AvctTagList}>`;
    }
}

export class AvctClipScore extends ClipCellElementBase {
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
        globalDialog({ type: AvctClipHistoryDialog, params: this.item.id });
    }

    renderContent(): TemplateResult {
        if (!this.item.lastPlay) { return html`Never played`; }
        const diffDays = (new Date().getTime() / 1000 - this.item.lastPlay) / (3600 * 24);
        return html`${this.item.totalPlay} times (${this.item.getLastPlayText()}) <button class="td-hover round-button" @click="${this.popupView}">⏲</button>`;
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
        return html`${this.row.rating.toFixed(2)} <${AvctCtxMenu}>Test</${AvctCtxMenu}>`;
    }
}

export class AvctClips extends LitElement {
    @property({ attribute: false })
    clips?: Map<number, Clip>;

    @property({ attribute: false })
    tags?: Map<number, TagJson>;

    @property({ attribute: false, hasChanged: arrayNonEq(recordNonEq()) })
    rows: SortedClip[] = [];

    @property({ attribute: false })
    quickjerk: SortModel = new SortModel([]);

    applyFilter(): void {
        const sortedBy = this.quickjerk;
        this.rows = Array.from(this.clips?.values() ?? []).map(clip => ({
            clip, rating: sortedBy.score(clip), sortedBy
        })).sort((a, b) => b.rating - a.rating);
    }

    update(changedProps: Map<keyof AvctClips, any>): ReturnType<LitElement['update']> {
        if (changedProps.has('clips') || changedProps.has('quickjerk')) {
            this.applyFilter();
        }
        return super.update(changedProps);
    }

    updated(): ReturnType<LitElement['updated']> {
        requestAnimationFrame(now => {
            console.log(`RENDER FIN @${now}`);
        });
    }

    createRenderRoot(): ReturnType<LitElement['createRenderRoot']> { return this; }

    private static columns = [
        column('Thumb', AvctClipThumb),
        column('Name', AvctClipName),
        column('Rating', AvctClipScore),
        column('Roles', AvctClipRole),
        column('Race', AvctClipRace),
        column('Tags', AvctClipTags),
        column('Note', AvctClipNote),
        column('History', AvctClipHistory, false),
        column('Duration', AvctClipDuration, false),
        column('Rank', AvctClipSorting)
    ];

    render(): ReturnType<LitElement['render']> {
        if (!this.clips) {
            return html`Loading...`;
        }
        return html`
            <${AvctTable}
                .rows="${this.rows}"
                .columns="${AvctClips.columns}">
            </${AvctTable}>`;
    }
}
