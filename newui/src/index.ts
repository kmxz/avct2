import { LitElement } from 'lit-element/lit-element.js';
import { clips, tags } from './data';
import { html } from './components/registry';
import { asyncReplace } from 'lit-html/directives/async-replace.js';
import { property } from 'lit-element/decorators/property.js';

// Imports for custom element definitions.
import { AvctDialogContainer, globalDialog } from './components/dialog';
import { AvctClips } from './clips';
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

    private editTags() {
        globalDialog({ type: AvctTagManagerDialog, title: 'Tag manager' }, false);
    }

    render(): ReturnType<LitElement['render']> {
        return html`
            <main>
                <header>
                    <button @click="${this.editQj}">Quickjerk (${this.qj.ruleCount} rules)</button>
                    <button @click="${this.editTags}">Tag manager</button>
                </header>
                <${AvctClips} .clips="${asyncReplace(clips.value())}" .tags="${asyncReplace(tags.value())}" .quickjerk="${this.qj}"></${AvctClips}>
            </main>
            <${AvctDialogContainer}></${AvctDialogContainer}>
            <${AvctToastContainer}></${AvctToastContainer}>
        `;
    }

    createRenderRoot(): ReturnType<LitElement['createRenderRoot']> { return this; }
}

window.customElements.define('avct-root', AvctRootElement);