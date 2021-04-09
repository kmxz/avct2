import { LitElement, css } from 'lit-element/lit-element.js';
import { html } from '../components/registry';
import { property } from 'lit-element/decorators/property.js';
import { query } from 'lit-element/decorators/query.js';

export class AvctTextEdit extends LitElement {
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

    @property({ attribute: false })
    value!: string;

    @query('input')
    input!: HTMLInputElement;

    private change() { this.dispatchEvent(new CustomEvent<void>('avct-touch')); }

    private emit(): void {
        const detail = this.input.value.trim();
        this.dispatchEvent(new CustomEvent<string>('avct-select', { detail }));
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) { return; }
        if (e.code === 'Enter') { this.emit(); e.preventDefault(); }
    }

    firstUpdated(): ReturnType<LitElement['firstUpdated']> { this.input.focus(); }

    render(): ReturnType<LitElement['render']> {
        return html`
            <link rel="stylesheet" href="./shared.css" />
            <input type="text" value="${this.value}" @input="${this.change}" @keydown="${this.handleKeyDown}" />
            <button @click="${this.emit}">Save</button>
        `;
    }
}
