import { LitElement, css } from 'lit-element/lit-element.js';
import { html } from '../components/registry';
import { queryAll } from 'lit-element/decorators/query-all.js';
import { Role, ROLES } from '../model';
import { PopupBase } from '../components/dialog';

export class AvctRoleSelection extends PopupBase<Role[], Role[]> {
    static styles = css`
        :host {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            column-gap: 8px;
        }
        button {
            grid-column: span 2;
            margin-top: 4px;
        }
    `;

    @queryAll('input')
    inputs!: NodeListOf<HTMLInputElement>;
    
    private emit(): void {
        this.done(Array.from(this.inputs).filter(input => input.checked).map(input => input.value as Role));
    }

    render(): ReturnType<LitElement['render']> {
        return html`
            <link rel="stylesheet" href="./shared.css" />
            ${ROLES.map(role => html`<label><input type="checkbox" value="${role}" ?checked="${this.params.includes(role)}" @click="${this.markDirty}" />${role}</label>`)}
            <button @click="${this.emit}">Save</button>
        `;
    }
}
