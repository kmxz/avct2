import { LitElement, css } from 'lit-element/lit-element.js';
import { html } from '../components/registry';
import { property } from 'lit-element/decorators/property.js';
import { until } from 'lit-html/directives/until.js';
import { players } from '../data';
import { sendTypedApi } from '../api';
import { globalDialog } from '../components/dialog';
import { AvctSimilarClipsDialog } from '../dialogs/similar-clips';
import { globalToast } from '../components/toast';

export class AvctClipPlay extends LitElement {
    static styles = css`
        :host { display: block; position: relative; }
        button[name="record"]:not(:last-of-type) {
            border-top-right-radius: 0;
            border-bottom-right-radius: 0;
            margin-right: -1px;
        }
        button[name="no-record"]:not(:first-of-type) {
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;
        }
        .btn-group {
            margin-top: 4px;
        }
        .default {
            margin-top: 0;
        }
        hr { border: 0; border-bottom: 1px solid #c7c7c7; }
        .path { white-space: normal; overflow-wrap: break-word; }
    `;

    firstUpdated(): ReturnType<LitElement['firstUpdated']>  {
        this.shadowRoot!.addEventListener('click', e => {
            if ((e.target as Node).nodeName.toUpperCase() !== 'BUTTON') { return; }
            const button = e.target as HTMLButtonElement;
            let record: boolean;
            switch (button.name) {
                case 'folder':
                    sendTypedApi('!clip/$/folder', { id: this.clipId });
                    return;
                case 'copy':
                    this.copyText();
                    return;
                case 'record':
                    record = true;
                    break;
                case 'no-record':
                    record = false;
                    break;
                default:
                    return;
            }
            const btnGroup = button.parentNode as HTMLDivElement;
            const player = btnGroup.dataset['player']!;
            sendTypedApi('!clip/$/open', { record, player, id: this.clipId });
        });
    }

    @property({ attribute: false })
    clipId!: number;

    @property({ attribute: false })
    path!: string;

    @property({ type: Boolean })
    insideSpecial!: boolean;

    private copyText(): void {
        const encoded = `'${this.path.replace(/'/g, `'"'"'`)}'`;
        navigator.clipboard.writeText(' ' + encoded).then(
            () => globalToast('Copied to clipboard!'),
            () => globalToast('Failed to copy: ' + encoded)
        );
    }

    private openSimilar(): void {
        globalDialog({ type: AvctSimilarClipsDialog, title: 'Similar clips', params: this.clipId }, false);
    }

    render(): ReturnType<LitElement['render']> {
        return html`
            <link rel="stylesheet" href="./shared.css" />
            <div class="btn-group default" data-player="">${this.insideSpecial ? html`<button name="no-record">Default player</button>` : html`<button name="record">Default player</button><button name="no-record">w/o REC</button>`}</div>
            ${until(players.then(list => list.map(name => html`<div class="btn-group" data-player="${name}">${this.insideSpecial ? html`<button name="no-record">${name}</button>` : html`<button name="record">${name}</button><button name="no-record">w/o REC</button>`}</div>`)), html`<span loading></span>`)}
            <hr />
            <div class="path"><button name="folder">Open in folder</button> (${this.path} <button name="copy">Copy</button>)</div>
            ${this.insideSpecial ? null : html`<hr /><button name="similar" @click="${this.openSimilar}">Similar clips</button>`}
        `;
    }
}
