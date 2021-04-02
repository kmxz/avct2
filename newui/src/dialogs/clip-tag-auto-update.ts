import { css, LitElement } from 'lit-element/lit-element.js';
import { html } from '../components/registry';
import { DialogBase } from '../components/dialog';
import { repeat } from 'lit-html/directives/repeat.js';
import { Clip, clips } from '../data';
import { MultiStore, TagJson } from '../model';
import { property } from '@lit/reactive-element/decorators/property.js';
import { globalToast } from '../components/toast';

export type ClipAutoUpdateTask = { clip: Clip; newTags: number[]; changedTags: TagJson[]; status?: any; };

export class AvctClipTagAutoUpdateDialog extends DialogBase<ClipAutoUpdateTask[], void> {
    static styles = css`
        table {
            border-collapse: collapse;
            margin: 16px auto;
        }
        th, td {
            border: 1px solid #e0e0e9;
            padding: 4px 8px;
        }
        footer {
            text-align: center;
        }
    `;
    
    @property({ attribute: false })
    inProgress = false;

    @property({ attribute: false })
    finished = false;

    @property({ attribute: false })
    updates: ClipAutoUpdateTask[] = [];

    firstUpdated(): ReturnType<LitElement['firstUpdated']> {
        this.updates = this.params;
    }

    private async executeUpdates(): Promise<void> {
        this.inProgress = true;
        const totalIndex = this.updates.length;
        for (let i = 0; i < totalIndex; i++) {
            const copy = Array.from(this.updates);
            const entry = copy[i];
            copy[i] = { ...entry, status: `In progress` };
            this.updates = copy;
            try {
                await entry.clip.update('tags', entry.newTags, { loading: false });
                copy[i] = { ...entry, status: `Done` };
            } catch (e) {
                copy[i] = { ...entry, status: `Error: ${e}` };
            }
            this.updates = copy;
        }
        this.inProgress = false;
        this.finished = true;
    }

    render(): ReturnType<LitElement['render']> {
        return html`
            <link rel="stylesheet" href="./shared.css" />
            The following clips need to be updated:
            <table>
                <thead><tr><th>Clip</th><th>New tags to apply</th><th>Status</th></tr></thead>
                <tbody>
                    ${repeat(this.updates, item => item.clip.id, item =>
                        html`<tr><td>${item.clip.path}</td><td>${item.changedTags.map(child => html`<span class="tag-chip ${'tag-type-' + child.type.toLowerCase()}">${child.name}</span>`)}</td><td>${item.status ?? 'Not started'}</td></tr>`
                    )}
                </tbody>
            </table>
            <footer>
                ${this.finished ? html`<button @click="${this.done}">Close</button>` : (this.inProgress ? 'In progress (see above)' : html`
                    <button @click="${this.executeUpdates}" ?disabled="${this.inProgress}">Execute updates</button>
                    <button @click="${this.abort}" ?disabled="${this.inProgress}">Skip updates</button>
                `)}
            </footer>
        `;
    }
}
