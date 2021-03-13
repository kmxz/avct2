import { LitElement, css, PropertyValues } from 'lit-element/lit-element.js';
import { customElement } from 'lit-element/decorators/custom-element.js';
import { AvctCtxMenuElementKey, AvctDialogContainerElementKey, StaticTagName } from '../registry';
import { MultiStore } from '../model';
import { property } from 'lit-element/decorators/property.js';
import { html } from 'lit-html/static.js';
import { asyncReplace } from 'lit-html/directives/async-replace.js';
import { repeat } from 'lit-html/directives/repeat.js';
import { seq } from './utils';

interface DialogOptions {
    title: string;
    type: StaticTagName;
    params: any;
    cancellable: boolean;
}

interface Dialog extends DialogOptions {
    id: number;
    onSelect: (callbackParams: any) => void;
    onCancel: () => void;
}

const globalDialogs = new MultiStore<Dialog[]>(Promise.resolve([]));

const uniqId = seq();
export const globalDialog = (dialog: Partial<DialogOptions> & Pick<DialogOptions, 'type'>): Promise<any> => new Promise((res, rej) => 
    globalDialogs.update(list => list.concat({
        title: 'Dialog',
        cancellable: true,
        params: void 0,
        ...dialog,
        id: uniqId(),
        onSelect: res,
        onCancel: rej
    }))
);

@customElement(AvctDialogContainerElementKey)
export class AvctDialogContainerElement extends LitElement {
    static styles = css`
        .dialog-modal { position: fixed; top: 0; right: 0; bottom: 0; left: 0; background: rgba(0, 0, 0, 0.2); display: flex; justify-content: center; z-index: 2; padding: 32px; }
        .dialog-proper { align-self: center; background: #fff; padding: 0 16px 16px 16px; box-shadow: 0 1px 5px rgba(0, 0, 0, 0.25); max-height: 100%; overflow: auto; }
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
        }
        .dialog-title button { margin-left: 16px; }
    `;

    @property({ attribute: false })
    dialogs = globalDialogs;

    private handleClose(dialogProper: HTMLDivElement, result: CustomEvent<any> | undefined) {
        const id = parseInt(dialogProper.dataset['dialogId']!);
        this.dialogs.update(oldDialogs => {
            const toRemove = oldDialogs.find(item => item.id === id)!;
            if (result) {
                toRemove.onSelect(result.detail);
            } else {
                toRemove.onCancel();
            }
            return oldDialogs.filter(dialog => dialog !== toRemove);
        });
    }

    private handleChildSelect(e: CustomEvent<any>): void {
        this.handleClose((e.currentTarget as LitElement).parentNode as HTMLDivElement, e);
    }

    private handleCloseButton(e: MouseEvent) {
        this.handleClose(((e.currentTarget as HTMLSpanElement).parentNode as HTMLDivElement).parentNode as HTMLDivElement, void 0);
    }

    render() {
        return html`${asyncReplace(this.dialogs.value(), value => {
            const list = value as Dialog[];
            return list.length ? repeat(list, dialog => dialog.id, dialog => html`
                <link rel="stylesheet" href="./shared.css" />
                <div class="dialog-modal">
                    <div class="dialog-proper" data-dialog-id="${String(dialog.id)}">
                        <h2><span>${dialog.title}</span>${dialog.cancellable ? html`<button class="round-button" @click="${this.handleCloseButton}">🗙</button>` : null}</h2>
                        <${dialog.type} .params=${dialog.params} @avct-select="${this.handleChildSelect}" .params="${dialog.params}"></${dialog.type}>
                    </div>
                </div>
            `) : null;
        })}`;
    }
}