import { LitElement, css } from 'lit-element/lit-element.js';
import { html } from '../components/registry';
import { property } from 'lit-element/decorators/property.js';
import { RACES, Race } from '../model';
import { PopupBase } from '../components/dialog';

export class AvctRaceSelection extends PopupBase<Race, Race> {
    static styles = css`
        label {
            display: block;
        }
    `;

    @property({ attribute: false })
    selected!: Race;

    private emit(e: Event): void {
        this.done((e.target as HTMLInputElement).value as Race);
    }

    render(): ReturnType<LitElement['render']> {
        return RACES.map(race => html`<label><input type="radio" @click="${this.emit}" value="${race}" ?checked="${this.selected === race}" />${race}</label>`);
    }
}
