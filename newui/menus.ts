import { LitElement, css } from 'lit-element/lit-element.js';
import { customElement } from 'lit-element/decorators/custom-element.js';
import { AvctRaceSelectionElementKey, AvctRoleSelectionElementKey, AvctTextEditElementKey } from './registry';
import { property } from 'lit-element/decorators/property.js';
import { query } from 'lit-element/decorators/query.js';
import { queryAll } from 'lit-element/decorators/query-all.js';
import { html } from 'lit-html/static.js';
import { RACES, Race, Role, ROLES } from './model';

@customElement(AvctRaceSelectionElementKey)
export class AvctRaceSelectionElement extends LitElement {
    static styles = css`
        label {
            display: block;
        }
    `;

    @property({ attribute: false })
    selected!: Race;

    private emit(e: Event): void {
        this.dispatchEvent(new CustomEvent<Race>('avct-select', { detail: ((e.target as HTMLInputElement).value as Race) }));
    }
    
    render() {
        return RACES.map(race => html`<label><input type="radio" @click="${this.emit}" value="${race}" ?checked="${this.selected === race}" />${race}</label>`);
    }
}

@customElement(AvctRoleSelectionElementKey)
export class AvctRoleSelectionElement extends LitElement {
    static styles = css`
        :host {
            display: grid;
            grid-template-columns: 1fr 1fr;
            column-gap: 8px;
        }
        button {
            grid-column: span 2;
            margin-top: 4px;
        }
    `;

    @property({ attribute: false })
    selected!: Role[];

    @queryAll('input')
    inputs!: NodeListOf<HTMLInputElement>;

    private check() { this.dispatchEvent(new CustomEvent<void>('avct-touch')); }

    private emit(): void {
        const detail = Array.from(this.inputs).filter(input => input.checked).map(input => input.value as Role);
        this.dispatchEvent(new CustomEvent<Role[]>('avct-select', { detail }));
    }
    
    render() {
        return html`
            <link rel="stylesheet" href="./shared.css" />
            ${ROLES.map(role => html`<label><input type="checkbox" value="${role}" ?checked="${this.selected.includes(role)}" @click="${this.check}" />${role}</label>`)}
            <button @click="${this.emit}">Save</button>
        `;
    }
}

@customElement(AvctTextEditElementKey)
export class AvctTextEditElement extends LitElement {
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
    
    render() {
        return html`
            <link rel="stylesheet" href="./shared.css" />
            <input type="text" value="${this.value}" @input="${this.change}" @keydown="${this.handleKeyDown}" />
            <button @click="${this.emit}">Save</button>
        `;
    }
}