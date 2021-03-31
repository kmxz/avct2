import { LitElement, css } from 'lit-element/lit-element.js';
import { html } from '../components/registry';
import { DialogBase } from '../components/dialog';
import { SortModel, ScorerBuilder, MINIMUM_WEIGHT, MAXIMUM_WEIGHT, POSSIBLE_SCORERS, scorerBuilder } from '../quickjerk-mechanism';
import { repeat } from 'lit-html/directives/repeat.js';
import { AvctTagListSimple } from '../tags';

export class QuickjerkModal extends DialogBase<ScorerBuilder<any>[], SortModel> {

    static styles = css`
        :host { display: block; max-width: 560px; }
        header button {
            margin: 2px;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            text-align: center;
            margin: 16px 0;
        }
        footer { text-align: center; }
    `;

    private getScorerIndex(e: Event): number {
        const td = e.currentTarget as HTMLTableDataCellElement;
        const tr = td.parentNode as HTMLTableRowElement;
        const key = tr.dataset['scorerKey']!;
        return this.params.findIndex(item => item.key === key);
    }

    private handleParamChange(e: Event): void {
        const input = e.target as HTMLInputElement | HTMLSelectElement;
        const name = input.name;
        let value;
        if (input instanceof HTMLInputElement) {
            switch (input.type) {
                case 'text':
                    value = input.value;
                    break;
                case 'number':
                    value = parseFloat(input.value);
                    break;
                case 'checkbox':
                    value = !!input.checked;
            }
        } else if (input instanceof HTMLSelectElement) {
            value = input.value || void 0;
        }

        const newParams = [...this.params];
        const index = this.getScorerIndex(e);
        newParams[index] = { ...newParams[index], config: { ...newParams[index].config, [name]: value } };
        this.params = newParams;
    }

    private handleAvctParamChange(e: CustomEvent<any>): void {
        if (e.target instanceof AvctTagListSimple) {
            const newParams = [...this.params];
            const index = this.getScorerIndex(e);
            newParams[index] = { ...newParams[index], config: { ...newParams[index].config, value: e.detail } };
            this.params = newParams;
        }
    }

    private handleWeightChange(e: Event): void {
        const weight = parseFloat((e.target as HTMLInputElement).value);

        const newParams = [...this.params];
        const index = this.getScorerIndex(e);
        newParams[index] = { ...newParams[index], weight };
        this.params = newParams;
    }

    private onRemoveScorer(e: Event): void {
        const td = e.currentTarget as HTMLButtonElement;
        const tr = td.parentNode!.parentNode as HTMLTableRowElement;
        const key = tr.dataset['scorerKey']!;
        this.params = this.params.filter(scorer => scorer.key !== key);
    }

    private handleHeaderClick(e: Event): void {
        const button = e.target as HTMLButtonElement;
        const index = parseInt(button.dataset['index']!);

        this.params = [...this.params, scorerBuilder(POSSIBLE_SCORERS[index])];
    }

    private handleSubmit(): void {
        this.done(new SortModel(this.params));
    }

    render(): ReturnType<LitElement['render']> {
        return html`
            <link rel="stylesheet" href="./shared.css" />
            <header @click="${this.handleHeaderClick}">
                Add more: ${repeat(POSSIBLE_SCORERS, item => item.name, (item, index) => html`<button data-index="${index}">${item.name}</button>`)}
            </header>
            <table>
                <thead>
                    <tr><th>Type</th><th>Config</th><th>Weight</th></tr>
                </thead>
                <tbody>
                    ${repeat(this.params, builder => builder.key, builder => html`<tr data-scorer-key="${builder.key}">
                        <td>${builder.implementation.name}</td>
                        <td @change="${this.handleParamChange}" @avct-bubble-change="${this.handleAvctParamChange}">${builder.implementation.configUi(builder.config)}</td>
                        <td @change="${this.handleWeightChange}"><input type="number" step="${MINIMUM_WEIGHT}" max="${MAXIMUM_WEIGHT}" min="${-MAXIMUM_WEIGHT}" name="weight" value="${builder.weight}" /><button class="round-button" @click="${this.onRemoveScorer}">🗑</button></td>
                    </tr>`)}
                </tbody>
            </table>
            <footer>
                <button @click="${this.handleSubmit}">Done</button>
            </footer>
        `;
    }

}