import { LitElement, css } from 'lit-element/lit-element.js';
import { property } from 'lit-element/decorators/property.js';
import { html } from './registry';
import { send } from './api';

export class AvctClipsUpdates extends LitElement {
    static styles = css`
        h3 {
            font-size: 15px;
            margin: 16px 0 12px;
        }
        p {
            margin: 12px 0;
        }
        ul {
            margin: 0;
        }
    `;

    @property({ attribute: false })
    params?: { added: string[], disappeared: string[] };

    render() {
        if (!this.params) { return null; }
        return html`
            ${this.params.added.length ? html`<h3>Files added</h3><p>Those clips are just added. Refresh to see them.</p><ul>${this.params.added.map(item => html`<li>${item}</li>`)}</ul>` : null}
            ${this.params.disappeared.length ? html`<h3>Files disappeared</h3><p>Those clips have disappeared from the directory.</p><ul>${this.params.disappeared.map(item => html`<li>${item}</li>`)}</ul>` : null}
        `;
    }
}

export class AvctClipHistoryDialog extends LitElement {
    static styles = css`
        :host { display: block; position: relative; min-height: 20px; }
        ul { margin: 0; }
    `;

    @property({ attribute: false })
    params?: number;

    @property({ attribute: false })
    history?: number[];    

    @property({ reflect: true, type: Boolean })
    loading = true;

    private static ymdhis(dateSec: number): string {
        const zerofill = (num: number) => { return ('0' + num).slice(-2); }
        const date = new Date(dateSec * 1000);
        return date.getFullYear() + '-' + zerofill(date.getMonth() + 1) + '-' + zerofill(date.getDate()) + ' ' + zerofill(date.getHours()) + ':' + zerofill(date.getMinutes()) + ':' + zerofill(date.getSeconds());
    };

    updated(changedProps: Map<keyof AvctClipHistoryDialog, any>) {
        if (changedProps.has('params')) {
            this.loading = true;
            send('clip/history', { id: this.params }).then((response: number[]) => {
                this.loading = false;
                this.history = response;
            });
        }
    }

    render() {
        return html`<link rel="stylesheet" href="./shared.css" /><ul>${this.history?.map(item => html`<li>${AvctClipHistoryDialog.ymdhis(item)}</li>`)}</ul>`;
    }
}