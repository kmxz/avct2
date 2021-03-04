import { column } from './table';
import { LitElement, css, TemplateResult } from 'lit-element/lit-element.js';
import { html } from 'lit-html/static.js';
import { customElement } from 'lit-element/decorators/custom-element.js';
import { property } from 'lit-element/decorators/property.js';
import { arrayNonEq, TagJson, ClipCallback } from './model';
import { tags, Clip } from './data';
import { AvctClipName, AvctClipNameElementKey, AvctClipScoreElementKey, AvctClipScore, AvctClipsElementKey, AvctTable, AvctClipTagsElementKey, AvctTagList, AvctClipTags } from './registry';
import { asyncReplace } from 'lit-html/directives/async-replace.js';

@customElement(AvctClipsElementKey)
export class AvctClipsElement extends LitElement {
    @property({ attribute: false })
    clips: Map<number, Clip> = new Map();

    @property({ attribute: false })
    tags: Map<number, TagJson> = new Map();

    @property({ attribute: false, hasChanged: arrayNonEq() })
    rows: number[] = [];

    applyFilter(): void {
        this.rows = Array.from(this.clips.keys());
    }

    firstUpdated() {
        for (const clip of this.clips.values()) {
            clip.validate(this.tags);
        }
        this.applyFilter();
    }

    render() {
        return html`<${AvctTable} .rows="${this.rows.map(id => this.clips.get(id))}" .columns="${[
            column('Name', AvctClipName),
            column('Score', AvctClipScore),
            column('Tags', AvctClipTags),
        ]}"></${AvctTable}>`;
    }
}

abstract class ClipCellElementBase extends LitElement implements ClipCallback {
    static styles = css`
        :host {
            display: block;
            position: relative;
        }

        @keyframes rotate{
            to { transform: rotate(360deg); }
        }

        :host([loading])::before { 
            content: '';
            width: 16px;
            height: 16px;
            border-width: 4px;
            border-style: solid;
            border-color: black black black transparent;
            border-radius: 50%;
            opacity: 0.5;
            position: absolute;
            margin-left: -8px;
            margin-top: -8px;
            left: 50%;
            top: 50%;
            animation: rotate 1.5s linear infinite;
        }

        .error {
            content: '⚠ ' attr(invalid);
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
    `;

    @property({ attribute: false })
    item!: Clip;

    // Not being read. Used to trigger update only.
    @property({ attribute: false })
    version!: number;

    @property({ type: Boolean, reflect: true })
    loading = false;
    
    td(): HTMLTableDataCellElement {
        const td = this.parentNode as HTMLElement;
        if (td.nodeName.toUpperCase() !== 'TD') { throw new TypeError('Not used as a cell.'); }
        return td as HTMLTableDataCellElement;
    }

    rerenderAll() {
        const tr = this.td().parentNode!;
        for (const node of Array.from(tr.childNodes)) {
            if (node.nodeName !== 'TD') { continue; }
            const cell = (node as HTMLTableDataCellElement).firstElementChild;
            if (!(cell instanceof ClipCellElementBase)) { throw new TypeError('Sibling not a cell.'); }
            cell.version = this.item.version;
        }
    }

    render() {
        const errors = this.item.errors.instance?.get(this.tagName.toLowerCase());
        return html`${this.renderContent()}${errors?.map(item => html`<span class="error">${item}</span>`)}`;
    }

    abstract renderContent(): TemplateResult;
}

@customElement(AvctClipNameElementKey)
export class AvctClipNameElement extends ClipCellElementBase {
    static get styles() { return super.styles; }

    renderContent() {
        return html`${this.item.getFile()}`;
    }
}

@customElement(AvctClipTagsElementKey)
export class AvctClipTagsElement extends ClipCellElementBase {
    static get styles() { return super.styles; }

    renderContent() {
        return html`<${AvctTagList} .tags="${asyncReplace(tags.value(), tagMap => this.item.getTags().map(id => (tagMap as Map<number, TagJson>).get(id)))}"></${AvctTagList}>`;
    }
}

@customElement(AvctClipScoreElementKey)
export class AvctClipScoreElement extends ClipCellElementBase {
    static get styles() { 
        return [super.styles, css`button { background: none; border: 0 none; padding: 0; margin: 0; }`];
    }

    private async handleClick(e: MouseEvent): Promise<void> {
        if ((e.target as HTMLElement).tagName.toUpperCase() !== 'BUTTON') { return; }
        const star = e.target as HTMLButtonElement;
        const score = parseInt(star.value);
        await this.item.setRating(score, this);
    }
    
    renderContent() {
        const rating = this.item.getRating();
        return html`<div @click="${this.handleClick}">${Array.from(Array(5).keys()).map(index => 
            html`<button value="${String(index + 1)}">${(rating > index) ? '★' : '☆'}</button>`
        )}</div>`;
    }
}