import { css, LitElement } from 'lit-element/lit-element.js';
import { property } from 'lit-element/decorators/property.js';
import { html } from '../components/registry';
import { sendTypedApi } from '../api';
import { DialogBase } from '../components/dialog';

export class AvctClipHistoryDialog extends DialogBase<number, void> {
    static styles = css`
        :host { display: block; position: relative; min-height: 20px; }
        ul { margin: 0; }
    `;

    @property({ attribute: false })
    history?: number[];

    @property({ reflect: true, type: Boolean })
    loading = true;

    private static ymdhis(dateSec: number): string {
        const zerofill = (num: number) => { return ('0' + num).slice(-2); };
        const date = new Date(dateSec * 1000);
        return date.getFullYear() + '-' + zerofill(date.getMonth() + 1) + '-' + zerofill(date.getDate()) + ' ' + zerofill(date.getHours()) + ':' + zerofill(date.getMinutes()) + ':' + zerofill(date.getSeconds());
    }

    updated(changedProps: Map<keyof AvctClipHistoryDialog, any>): ReturnType<LitElement['updated']> {
        if (changedProps.has('params')) {
            this.loading = true;
            sendTypedApi('clip/$/history', { id: this.params }).then((response: number[]) => {
                this.loading = false;
                this.history = response;
            });
        }
    }

    render(): ReturnType<LitElement['render']> {
        return html`<link rel="stylesheet" href="./shared.css" /><ul>${this.history?.map(item => html`<li>${AvctClipHistoryDialog.ymdhis(item)}</li>`)}</ul>`;
    }
}
