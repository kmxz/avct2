import { LitElement, css } from 'lit-element/lit-element.js';
import { html } from './components/registry';
import { property } from 'lit-element/decorators/property.js';
import { query } from 'lit-element/decorators/query.js';
import { queryAll } from 'lit-element/decorators/query-all.js';
import { RACES, Race, Role, ROLES } from './model';
import { until } from 'lit-html/directives/until.js';
import { players } from './data';
import { send } from './api';
import { globalDialog } from './components/dialog';
import { AvctSimilarClipsDialog } from './dialogs';

export class AvctRaceSelection extends LitElement {
    static styles = css`
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

    private check() { this.dispatchEvent(new CustomEvent<void>('avct-touch')); }

    private emit(): void {
        const detail = Array.from(this.inputs).filter(input => input.checked).map(input => input.value as Role);
        this.dispatchEvent(new CustomEvent<Role[]>('avct-select', { detail }));
    }
    
    render() {
        return html`
            <link rel="stylesheet" href="./shared.css" />
            ${ROLES.map(role => html`<label><input type="checkbox" value="${role}" ?checked="${this.selected.includes(role)}" @click="${this.check}" />${role}</label>`)}
            <button @click="${this.emit}">Save</button>
        `;
    }
}

export class AvctTextEdit extends LitElement {
    static styles = css`
        input, button {
            display: block;
            width: 180px;
            box-sizing: border-box;
        }
        button {
            margin-top: 6px;
        }
    `;

    @property({ attribute: false })
    value!: string;

    @query('input')
    input!: HTMLInputElement;

    private change() { this.dispatchEvent(new CustomEvent<void>('avct-touch')); }

    private emit(): void {
        const detail = this.input.value.trim();
        this.dispatchEvent(new CustomEvent<string>('avct-select', { detail }));
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) { return; }
        if (e.code === 'Enter') { this.emit(); e.preventDefault(); }
    }
    
    render() {
        return html`
            <link rel="stylesheet" href="./shared.css" />
            <input type="text" value="${this.value}" @input="${this.change}" @keydown="${this.handleKeyDown}" />
            <button @click="${this.emit}">Save</button>
        `;
    }
}

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
        .path { white-space: normal; }
    `;

    firstUpdated() {
        this.shadowRoot!.addEventListener('click', e => {
            if ((e.target as Node).nodeName.toUpperCase() !== 'BUTTON') { return; }
            const button = e.target as HTMLButtonElement;
            let record: boolean;
            switch (button.name) {
                case 'folder':
                    send('clip/folder', { id: this.clipId });
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
            const player = btnGroup.dataset['player'];
            send('clip/open', { record, player, id: this.clipId });
        });
    }

    @property({ attribute: false })
    clipId!: number;

    @property({ attribute: false })
    path!: string;

    @property({ type: Boolean })
    insideSpecial!: boolean;

    private openSimilar(): void {
        globalDialog({ type: AvctSimilarClipsDialog, title: 'Similar clips', params: this.clipId });
    }

    render() {
        return html`
            <link rel="stylesheet" href="./shared.css" />
            <div class="btn-group default" data-player="">${this.insideSpecial ? html`<button name="no-record">Default player</button>` : html`<button name="record">Default player</button><button name="no-record">w/o REC</button>`}</div>
            ${until(players.then(list => list.map(name => html`<div class="btn-group" data-player="${name}">${this.insideSpecial ? html`<button name="no-record">${name}</button>` : html`<button name="record">${name}</button><button name="no-record">w/o REC</button>`}</div>`)), html`<span loading></span>`)}
            <hr />
            <div class="path"><button name="folder">Open in folder</button> (${this.path})</div>
            ${this.insideSpecial ? null : html`<hr /><button name="similar" @click="${this.openSimilar}">Similar clips</button>`}
        `;
    }
}