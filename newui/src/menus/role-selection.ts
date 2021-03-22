import { LitElement, css } from 'lit-element/lit-element.js';
import { html } from '../components/registry';
import { property } from 'lit-element/decorators/property.js';
import { queryAll } from 'lit-element/decorators/query-all.js';
import { Role, ROLES } from '../model';

export class AvctRoleSelection extends LitElement {
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

    private check(): void { this.dispatchEvent(new CustomEvent<void>('avct-touch')); }

    private emit(): void {
        const detail = Array.from(this.inputs).filter(input => input.checked).map(input => input.value as Role);
        this.dispatchEvent(new CustomEvent<Role[]>('avct-select', { detail }));
    }

    render(): ReturnType<LitElement['render']> {
        return html`
            <link rel="stylesheet" href="./shared.css" />
            ${ROLES.map(role => html`<label><input type="checkbox" value="${role}" ?checked="${this.selected.includes(role)}" @click="${this.check}" />${role}</label>`)}
            <button @click="${this.emit}">Save</button>
        `;
    }
}
