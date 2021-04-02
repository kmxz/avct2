import { LitElement, css } from 'lit-element/lit-element.js';
import { html, Constructor } from './registry';
import { MultiStore } from '../model';
import { property } from 'lit-element/decorators/property.js';
import { asyncReplace } from 'lit-html/directives/async-replace.js';
import { repeat } from 'lit-html/directives/repeat.js';
import { seq } from './utils';

export abstract class DialogBase<I, O> extends LitElement {
    @property({ attribute: false })
    params!: I;

    protected done(detail: O): void {
        this.dispatchEvent(new CustomEvent('avct-select', { detail }));
    }

    protected abort(): void {
        this.dispatchEvent(new CustomEvent('avct-close'));
    }
}

export type DialogType<I, O> = Constructor<DialogBase<I, O>>;

interface DialogOptions<I, O> {
    title: string;
    type: DialogType<I, O>;
    params: I;
    cancellable: boolean;
}

interface Dialog<I, O> extends DialogOptions<I, O> {
    id: number;
    onSelect: (callbackParams: O) => void;
    onCancel: () => void;
}

const globalDialogs = new MultiStore<Dialog<any, any>[]>(Promise.resolve([]));

const uniqId = seq();

export const globalDialog = <I, O>(dialog: Partial<DialogOptions<I, O>> & Pick<DialogOptions<I, O>, 'type' | 'title'>, throwOnCancel: boolean): Promise<O> => new Promise((res, rej) => 
    globalDialogs.update(list => list.concat({
        cancellable: true,
        params: void 0,
        ...dialog,
        id: uniqId(),
        onSelect: res,
        onCancel: throwOnCancel ? rej : () => {}
    }))
);

export class AvctDialogContainer extends LitElement {
    static styles = css`
        .dialog-modal { position: fixed; top: 0; right: 0; bottom: 0; left: 0; background: rgba(0, 0, 0, 0.2); display: flex; justify-content: center; z-index: 2; padding: 32px; }
        .dialog-proper { align-self: center; background: #fff; box-shadow: 0 1px 5px rgba(0, 0, 0, 0.25); max-width: 100%; max-height: 100%; display: flex; flex-direction: column; }
        h2 {
            font-size: 16px;
            margin: 0;
            background-color: #f6f9fd;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 1;
            flex-grow: 0;
        }
        .dialog-content {
            padding: 16px;
            overflow-y: auto;
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

    private handleChildClose(e: CustomEvent<void>): void {
        this.handleClose((e.currentTarget as LitElement).parentNode as HTMLDivElement, void 0);
    }

    private handleCloseButton(e: MouseEvent) {
        this.handleClose(((e.currentTarget as HTMLSpanElement).parentNode as HTMLDivElement).parentNode as HTMLDivElement, void 0);
    }

    render(): ReturnType<LitElement['render']> {
        return html`
            <link rel="stylesheet" href="./shared.css" />
            ${asyncReplace(this.dialogs.value(), value => {
                const list = value as Dialog<any, any>[];
                return list.length ? repeat(list, dialog => dialog.id, dialog => html`
                    <div class="dialog-modal">
                        <div class="dialog-proper" data-dialog-id="${String(dialog.id)}">
                            <h2><span>${dialog.title}</span>${dialog.cancellable ? html`<button class="round-button" @click="${this.handleCloseButton}">🗙</button>` : null}</h2>
                            <${dialog.type} .params=${dialog.params} @avct-select="${this.handleChildSelect}" @avct-close="${this.handleChildClose}" .params="${dialog.params}" class="dialog-content"></${dialog.type}>
                        </div>
                    </div>
                `) : null;
            })
        }`;
    }
}