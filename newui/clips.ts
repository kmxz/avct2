import { column } from './table';
import { LitElement, TemplateResult } from 'lit-element/lit-element.js';
import { html } from 'lit-html/static.js';
import { customElement } from 'lit-element/decorators/custom-element.js';
import { property } from 'lit-element/decorators/property.js';
import { arrayNonEq, TagJson, ClipCallback, Race, Role } from './model';
import { tags, Clip } from './data';
import { AvctClipName, AvctClipNameElementKey, AvctClipScoreElementKey, AvctClipScore, AvctClipsElementKey, AvctTable, AvctClipTagsElementKey, AvctTagList, AvctClipTags, AvctClipRaceElementKey, AvctClipRoleElementKey, AvctClipRole, AvctClipRace, AvctClipNote, AvctClipNoteElementKey, AvctCtxMenu, AvctRaceSelection, AvctRoleSelection, AvctTextEdit } from './registry';
import { asyncReplace } from 'lit-html/directives/async-replace.js';
import { classMap } from 'lit-html/directives/class-map.js';
import { globalToast } from './toast';

@customElement(AvctClipsElementKey)
export class AvctClipsElement extends LitElement {
    @property({ attribute: false })
    clips?: Map<number, Clip>;

    @property({ attribute: false })
    tags?: Map<number, TagJson>;

    @property({ attribute: false, hasChanged: arrayNonEq() })
    rows: number[] = [];

    applyFilter(): void {
        this.rows = Array.from(this.clips!.keys());
    }

    updated(changedProps: Map<keyof AvctClipsElement, any>) {
        if (changedProps.has('clips')) {
            this.applyFilter();
        }
        requestAnimationFrame(now => {
            console.log(`RENDER FIN @${now}`);
        });
    }

    createRenderRoot() { return this; }

    private static columns = [
        column('Name', AvctClipName),
        column('Score', AvctClipScore),
        column('Roles', AvctClipRole),
        column('Race', AvctClipRace),
        column('Tags', AvctClipTags),
        column('Note', AvctClipNote),
    ];

    render() {
        if (!this.clips) {
            return html`Loading...`;
        }
        return html`<${AvctTable} .rows="${this.rows.map(id => this.clips!.get(id))}" .columns="${AvctClipsElement.columns}"></${AvctTable}>`;
    }
}

abstract class ClipCellElementBase extends LitElement implements ClipCallback {
    @property({ attribute: false })
    item!: Clip;

    @property({ type: Boolean, reflect: true })
    loading = false;
    
    td(): HTMLTableDataCellElement {
        const td = this.parentNode as HTMLElement;
        if (td.nodeName.toUpperCase() !== 'TD') { throw new TypeError('Not used as a cell.'); }
        return td as HTMLTableDataCellElement;
    }

    render() {
        // console.log(`Rendering ${this.tagName} for ${this.item.id}`);
        const errors = this.item.errors?.get(this.tagName.toLowerCase());
        return html`${this.renderContent()}${errors?.map(item => html`<span class="error">${item}</span>`)}`;
    }

    createRenderRoot() { return this; }

    abstract renderContent(): TemplateResult;
}

@customElement(AvctClipNameElementKey)
export class AvctClipNameElement extends ClipCellElementBase {
    renderContent() {
        return html`
            ${this.item.getFile()}
            <${AvctCtxMenu} title="${this.item.path}">
            </${AvctCtxMenu}>
        `;
    }
}

@customElement(AvctClipRaceElementKey)
export class AvctClipRaceElement extends ClipCellElementBase {
    @property({ attribute: false })
    edit = false;

    private startEdit(): void { this.edit = true; }
    private abortEdit(): void { this.edit = false; }
    private selects(e: CustomEvent<Race>): Promise<void> { this.edit = false; return this.item.update('race', e.detail, this); }
    
    renderContent() {
        return html`
            ${this.item.race}
            <button class="td-hover edit-button" @click="${this.startEdit}">✎</button>
            ${this.edit ? html`
                <${AvctCtxMenu} shown shadow title="Edit race" @avct-close="${this.abortEdit}">
                    <${AvctRaceSelection} .selected="${this.item.race}" @avct-select="${this.selects}"></${AvctRaceSelection}>
                </${AvctCtxMenu}>`
            : null}`;
    }
}

@customElement(AvctClipRoleElementKey)
export class AvctClipRoleElement extends ClipCellElementBase {
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
    
    renderContent() {
        return html`
            ${this.item.roles.map(role => html`<span>${role}</span>`)}
            <button class="td-hover edit-button" @click="${this.startEdit}">✎</button>
            ${this.edit ? html`
                <${AvctCtxMenu} shown shadow title="Edit roles" @avct-close="${this.abortEdit}">
                    <${AvctRoleSelection} .selected="${this.item.roles}" @avct-touch="${this.markDirty}" @avct-select="${this.selects}"></${AvctRoleSelection}>
                </${AvctCtxMenu}>` 
            : null}
        `;
    }
}

@customElement(AvctClipNoteElementKey)
export class AvctClipNoteElement extends ClipCellElementBase {
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

    renderContent() {
        return html`
            ${this.item.note}
            <button class="td-hover edit-button" @click="${this.startEdit}">✎</button>
            ${this.edit ? html`
                <${AvctCtxMenu} shown shadow title="Edit Source note" @avct-close="${this.abortEdit}">
                    <${AvctTextEdit} value="${this.item.note}" @avct-touch="${this.markDirty}" @avct-select="${this.done}"></${AvctTextEdit}>
                </${AvctCtxMenu}>`
            : null}
        `;
    }
}

@customElement(AvctClipTagsElementKey)
export class AvctClipTagsElement extends ClipCellElementBase {
    private removeTag(e: CustomEvent<number>): Promise<void> {
        const newTags = this.item.tags.filter(id => id !== e.detail);
        return this.item.update('tags', newTags, this);
    }

    private selectTag(e: CustomEvent<number>): Promise<void> {
        const newTags = this.item.tags.concat(e.detail);
        return this.item.update('tags', newTags, this);
    }

    renderContent() {
        return html`<${AvctTagList} .tags="${asyncReplace(tags.value(), tagMap => this.item.tags.map(id => (tagMap as Map<number, TagJson>).get(id)))}" @avct-select="${this.selectTag}" @avct-remove="${this.removeTag}"></${AvctTagList}>`;
    }
}

@customElement(AvctClipScoreElementKey)
export class AvctClipScoreElement extends ClipCellElementBase {
    @property({ attribute: false })
    preview = 0;

    private static targetScore(e: MouseEvent): number {
        if ((e.target as HTMLElement).tagName.toUpperCase() !== 'BUTTON') { return 0; }
        const star = e.target as HTMLButtonElement;
        return parseInt(star.value);
    }

    private async handleClick(e: MouseEvent): Promise<void> {
        const score = AvctClipScoreElement.targetScore(e);
        if (score > 0) {
            await this.item.update('grade', score, this);
            this.preview = 0;
        }
    }

    private handleMouseOver(e: MouseEvent): void {
        const score = AvctClipScoreElement.targetScore(e);
        if (score > 0) {
            this.preview = score;
        }
    }

    private handleMouseOut(e: MouseEvent): void {
        if (AvctClipScoreElement.targetScore(e) > 0) {
            this.preview = 0;
        }
    }
    
    renderContent() {
        const rating = this.item.score;
        return html`<div @click="${this.handleClick}" @mouseover="${this.handleMouseOver}" @mouseout="${this.handleMouseOut}">${Array.from(Array(5).keys()).map(index => 
            html`<button class="${classMap({ 'preview': this.preview > index })}" value="${String(index + 1)}">${(rating > index) ? '★' : '☆'}</button>`
        )}</div>`;
    }
}