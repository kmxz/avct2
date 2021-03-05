import { LitElement, css } from 'lit-element/lit-element.js';
import { customElement } from 'lit-element/decorators/custom-element.js';
import { AvctCtxMenu, AvctTagListElementKey } from './registry';
import { property } from 'lit-element/decorators/property.js';
import { html } from 'lit-html/static.js';
import { TagJson, TagType } from './model';

const sortOrder: Record<TagType, number> = {
    'Studio': 1, 'Content': 2, 'Format': 3, 'Special': 4
};

@customElement(AvctTagListElementKey)
export class AvctTagListElement extends LitElement {
    @property({ attribute: false })
    tags: TagJson[] = [];

    createRenderRoot() { return this; }

    @property({ attribute: false })
    add = false;

    private onAddTag(): void { this.add = true; }
    private abortAdd(): void { this.add = false; }

    render() {
        this.tags.sort((a, b) => {
            const byType = sortOrder[a.type] - sortOrder[b.type];
            return byType || (a.name.localeCompare(b.name));
        });
        return html`${
            this.tags.map(tag => html`
                <span class="${'tag-type-' + tag.type.toLowerCase()}">
                    ${tag.name}
                    <${AvctCtxMenu} title="${tag.type} tag"><button class="delete">Remove</button></${AvctCtxMenu}>
                </span>
            `)}
            <button class="td-hover edit-button" @click="${this.onAddTag}">+</button>
            ${this.add ? html`
                <${AvctCtxMenu} shown title="Add a tag" @avct-close="${this.abortAdd}">
                    TODO
                </${AvctCtxMenu}>`
            : null}`;
    }
}