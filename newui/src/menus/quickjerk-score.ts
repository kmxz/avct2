import { LitElement, css } from 'lit-element/lit-element.js';
import { html } from '../components/registry';
import { Clip } from '../data';
import { ScoreItem, SortModel } from '../quickjerk-mechanism';
import { PopupBase } from '../components/dialog';
import { SortedClip } from '../clips';

export class QuickjerkScore extends PopupBase<SortedClip, void> {
    static styles = css`
        table {
            border-collapse: collapse;
            font-size: 13px;
            margin: -8px;
        }
        th, td {
            padding: 4px;
            white-space: normal;
        }
        td {
            border-top: 1px solid #e0e0e0;
        }
    `;

    get clip(): Clip { return this.params.clip; }
    get sortedBy(): Pick<SortModel, 'scoreForDetail'> { return this.params.sortedBy; }

    // Purely-derived property. No need to check.
    scores: ScoreItem[] | undefined;

    update(changedProps: Map<keyof QuickjerkScore, any>): ReturnType<LitElement['update']> {
        if (changedProps.has('params')) {
            this.scores = this.sortedBy?.scoreForDetail(this.clip);
        }
        return super.update(changedProps);
    }
  
    render(): ReturnType<LitElement['render']> {
        return html`
            <table>
                <thead><tr><th>Scorer</th><th>Score</th><th>Reason</th></tr></thead>
                <tbody>
                    ${this.scores?.map(item => html`<tr><td>${item.name}</td><td>${item.score.toFixed(2)} × ${item.weight}</td><td>${item.message}</td></tr>`)}
                </tbody>
            </table>
        `;
    }
}
