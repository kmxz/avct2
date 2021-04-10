import { LitElement, css } from 'lit-element/lit-element.js';
import { html } from '../components/registry';
import { query } from 'lit-element/decorators/query.js';
import { PopupBase } from '../components/dialog';

export class AvctTextEdit extends PopupBase<string, string> {
    static styles = css`
        input, button {
            display: block;
            width: 180px;
            box-sizing: border-box;
        }
        button {
            margin-top: 6px;
        }
    `;

    @query('input')
    input!: HTMLInputElement;

    private emit(): void { this.done(this.input.value.trim()); }

    private handleKeyDown(e: KeyboardEvent): void {
        if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) { return; }
        if (e.code === 'Enter') { this.emit(); e.preventDefault(); }
    }

    firstUpdated(): ReturnType<LitElement['firstUpdated']> { this.input.focus(); }

    render(): ReturnType<LitElement['render']> {
        return html`
            <link rel="stylesheet" href="./shared.css" />
            <input type="text" value="${this.params}" @input="${this.markDirty}" @keydown="${this.handleKeyDown}" />
            <button @click="${this.emit}">Save</button>
        `;
    }
}
