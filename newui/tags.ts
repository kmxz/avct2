import { LitElement, css } from 'lit-element/lit-element.js';
import { customElement } from 'lit-element/decorators/custom-element.js';
import { AvctTagListElementKey } from './registry';
import { property } from 'lit-element/decorators/property.js';
import { TagJson } from './model';
import { html } from 'lit-html/static.js';

@customElement(AvctTagListElementKey)
export class AvctTagListElement extends LitElement {
    static styles = css`
        span {
            display: inline-block;
            background: #DEBEDF;
            padding: 2px 4px;
            margin: 2px;
            border-radius: 4px;
        }
    `;

    @property({ attribute: false })
    tags: TagJson[] = [];

    render() {
        return html`${this.tags.map(tag => html`<span>${tag.name}</span>`)}`;
    }
}