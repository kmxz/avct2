import { LitElement, css } from 'lit-element/lit-element.js';
import { customElement } from 'lit-element/decorators/custom-element.js';
import { AvctRaceSelectionElementKey, AvctRoleSelectionElementKey } from './registry';
import { property } from 'lit-element/decorators/property.js';
import { queryAll } from 'lit-element/decorators/query-all.js';
import { html } from 'lit-html/static.js';
import { RACES, Race, Role, ROLES } from './model';

@customElement(AvctRaceSelectionElementKey)
export class AvctRaceSelectionElement extends LitElement {
    static styles = css`
        :host {
            display: block;
            margin: 12px;
        }
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
            margin: 12px;
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
        return html`${ROLES.map(role => html`<label><input type="checkbox" value="${role}" ?checked="${this.selected.includes(role)}" @click="${this.check}" />${role}</label>`)}<button @click="${this.emit}">Done</button>`;
    }
}