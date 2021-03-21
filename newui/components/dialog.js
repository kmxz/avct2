var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, css } from 'lit-element/lit-element.js';
import { html } from './registry';
import { MultiStore } from '../model';
import { property } from 'lit-element/decorators/property.js';
import { asyncReplace } from 'lit-html/directives/async-replace.js';
import { repeat } from 'lit-html/directives/repeat.js';
import { seq } from './utils';
export class DialogBase extends LitElement {
    done(detail) {
        this.dispatchEvent(new CustomEvent('avct-select', { detail }));
    }
    abort() {
        this.dispatchEvent(new CustomEvent('avct-close'));
    }
}
__decorate([
    property({ attribute: false })
], DialogBase.prototype, "params", void 0);
const globalDialogs = new MultiStore(Promise.resolve([]));
const uniqId = seq();
export const globalDialog = (dialog) => new Promise((res, rej) => globalDialogs.update(list => list.concat({
    title: 'Dialog',
    cancellable: true,
    params: void 0,
    ...dialog,
    id: uniqId(),
    onSelect: res,
    onCancel: rej
})));
export class AvctDialogContainer extends LitElement {
    constructor() {
        super(...arguments);
        this.dialogs = globalDialogs;
    }
    handleClose(dialogProper, result) {
        const id = parseInt(dialogProper.dataset['dialogId']);
        this.dialogs.update(oldDialogs => {
            const toRemove = oldDialogs.find(item => item.id === id);
            if (result) {
                toRemove.onSelect(result.detail);
            }
            else {
                toRemove.onCancel();
            }
            return oldDialogs.filter(dialog => dialog !== toRemove);
        });
    }
    handleChildSelect(e) {
        this.handleClose(e.currentTarget.parentNode, e);
    }
    handleChildClose(e) {
        this.handleClose(e.currentTarget.parentNode, void 0);
    }
    handleCloseButton(e) {
        this.handleClose(e.currentTarget.parentNode.parentNode, void 0);
    }
    render() {
        return html `${asyncReplace(this.dialogs.value(), value => {
            const list = value;
            return list.length ? repeat(list, dialog => dialog.id, dialog => html `
                <link rel="stylesheet" href="./shared.css" />
                <div class="dialog-modal">
                    <div class="dialog-proper" data-dialog-id="${String(dialog.id)}">
                        <h2><span>${dialog.title}</span>${dialog.cancellable ? html `<button class="round-button" @click="${this.handleCloseButton}">🗙</button>` : null}</h2>
                        <${dialog.type} .params=${dialog.params} @avct-select="${this.handleChildSelect}" @avct-close="${this.handleChildClose}" .params="${dialog.params}"></${dialog.type}>
                    </div>
                </div>
            `) : null;
        })}`;
    }
}
AvctDialogContainer.styles = css `
        .dialog-modal { position: fixed; top: 0; right: 0; bottom: 0; left: 0; background: rgba(0, 0, 0, 0.2); display: flex; justify-content: center; z-index: 2; padding: 32px; }
        .dialog-proper { align-self: center; background: #fff; padding: 0 16px 16px 16px; box-shadow: 0 1px 5px rgba(0, 0, 0, 0.25); max-height: 100%; overflow-y: auto; }
        h2 {
            font-size: 16px;
            margin: 0 -16px 16px -16px;
            background-color: #f6f9fd;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 1;
        }
        .dialog-title button { margin-left: 16px; }
    `;
__decorate([
    property({ attribute: false })
], AvctDialogContainer.prototype, "dialogs", void 0);
