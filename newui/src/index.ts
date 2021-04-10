import { LitElement } from 'lit-element/lit-element.js';
import { clips, tags } from './data';
import { html } from './components/registry';
import { asyncReplace } from 'lit-html/directives/async-replace.js';
import { property } from 'lit-element/decorators/property.js';

// Imports for custom element definitions.
import { AvctDialogContainer, AvctPopupMenuContainer, globalDialog } from './components/dialog';
import { AvctClips, QuickjerkScoreControl, ScoreThresholdData } from './clips';
import { AvctToastContainer, globalToast } from './components/toast';
import { SortModel } from './quickjerk-mechanism';
import { AvctTagManagerDialog } from './dialogs/tag-manager';

export class AvctRootElement extends LitElement {
    private editQj(): void {
        this.qj.edit().then(newModel => {
            this.qj = newModel;
        }).catch(() => {
            globalToast('Quickjerk setting unchanged.');
        });
    }

    @property({ attribute: false })
    qj: SortModel = SortModel.DEFAULT;

    private editTags(): void {
        globalDialog({ type: AvctTagManagerDialog, title: 'Tag manager' }, false);
    }

    // Not self-used. Only passing from AvctClips to QuickjerkScoreControl.
    @property({ attribute: false })
    scoreControl?: ScoreThresholdData;
    private scoreControlDataChanged(e: CustomEvent<ScoreThresholdData>): void {
        console.debug(`passing from AvctClips to QuickjerkScoreControl: ${JSON.stringify(e.detail)}`);
        this.scoreControl = e.detail;
    }

    // Not self-used. Only passing from QuickjerkScoreControl to AvctClips.
    @property({ attribute: false })
    scoreThreshold = Number.NEGATIVE_INFINITY;
    private scoreThresholdValueChanged(e: CustomEvent<number>): void {
        console.debug(`passing from QuickjerkScoreControl to AvctClips: ${e.detail}`);
        this.scoreThreshold = e.detail;
    }

    render(): ReturnType<LitElement['render']> {
        return html`
            <main>
                <header>
                    <button @click="${this.editQj}">Quickjerk (${this.qj.ruleCount} rules)</button>
                    <${QuickjerkScoreControl} .scoreThresholdData="${this.scoreControl}" @avct-select="${this.scoreThresholdValueChanged}"></${QuickjerkScoreControl}>
                    <button @click="${this.editTags}">Tag manager</button>
                </header>
                <${AvctClips} .clips="${asyncReplace(clips.value())}" .tags="${asyncReplace(tags.value())}" .quickjerk="${this.qj}" @avct-score-control="${this.scoreControlDataChanged}" .scoreThreshold="${this.scoreThreshold}"></${AvctClips}>
            </main>
            <${AvctDialogContainer}></${AvctDialogContainer}>
            <${AvctPopupMenuContainer}></${AvctPopupMenuContainer}>
            <${AvctToastContainer}></${AvctToastContainer}>
        `;
    }

    createRenderRoot(): ReturnType<LitElement['createRenderRoot']> { return this; }
}

window.customElements.define('avct-root', AvctRootElement);