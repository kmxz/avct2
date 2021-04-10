import { css, LitElement } from 'lit-element/lit-element.js';
import { html } from '../components/registry';
import { PopupBase } from '../components/dialog';

export class AvctClipsUpdates extends PopupBase<{ added: string[]; disappeared: string[] }, void> {
    static styles = css`
        h3 {
            font-size: 15px;
            margin: 16px 0 12px;
        }
        h3:first-child { margin-top: 0; }
        p {
            margin: 12px 0;
        }
        ul {
            margin: 0;
        }
    `;

    render(): ReturnType<LitElement['render']> {
        if (!this.params) { return null; }
        return html`
            ${this.params.added.length ? html`<h3>Files added</h3><p>Those clips are just added. Refresh to see them.</p><ul>${this.params.added.map(item => html`<li>${item}</li>`)}</ul>` : null}
            ${this.params.disappeared.length ? html`<h3>Files disappeared</h3><p>Those clips have disappeared from the directory.</p><ul>${this.params.disappeared.map(item => html`<li>${item}</li>`)}</ul>` : null}
        `;
    }
}
