import { LitElement, css } from 'lit-element/lit-element.js';
import { html, Constructor } from './registry';
import { guardedRecordNonEq, MultiStore } from '../model';
import { property } from 'lit-element/decorators/property.js';
import { asyncReplace } from 'lit-html/directives/async-replace.js';
import { repeat } from 'lit-html/directives/repeat.js';
import { styleMap } from 'lit-html/directives/style-map.js';
import { classMap } from 'lit-html/directives/class-map.js';
import { seq } from './utils';

class AvctPopupClosure {
    constructor(readonly dirty: boolean) {}
}

export const popupClosed = <T>(callback: (dirty: boolean) => T): ((e: any) => T) => e => {
    if (!(e instanceof AvctPopupClosure)) {
        console.error('Closure value wrong', e);
        throw new RangeError('Closure type unexpected!');
    }
    return callback(e.dirty);
}

export const noOp = popupClosed(() => void 0);

export abstract class PopupBase<I, O> extends LitElement {
    @property({ attribute: false, hasChanged: guardedRecordNonEq() })
    params!: I;

    protected done(detail: O): void {
        this.dispatchEvent(new CustomEvent<O>('avct-select', { detail }));
    }

    protected abort(): void {
        this.dispatchEvent(new CustomEvent<void>('avct-close'));
    }
    
    protected markDirty(): void {
        this.dispatchEvent(new CustomEvent<void>('avct-touch'));
    }
}

export type PopupConstructor<I, O> = Constructor<PopupBase<I, O>>;

interface PopupOptions<I, O> {
    title: string;
    type: PopupConstructor<I, O>;
    params: I;
    cancellable: boolean;
}

interface Popup<I, O> extends PopupOptions<I, O> {
    id: number;
    onSelect: (callbackParams: O) => void;
    onCancel: (closure: AvctPopupClosure) => void;
    instance?: PopupBase<I, O>;
}

interface PopupWithContext<I, O> extends Popup<I, O> {
    reference: {
        element: HTMLElement;
        xOffset?: number; // Offset from X center of element bounding rect
        yOffset?: number; // Offset from Y center of element bounding rect
    };
}

type PopupSpec<I, O> = Partial<PopupOptions<I, O>> & Pick<PopupOptions<I, O>, 'type' | 'title'>;

const globalPopupDialogs = new MultiStore<Popup<any, any>[]>(Promise.resolve([]));
const globalPopupMenus = new MultiStore<PopupWithContext<any, any>[]>(Promise.resolve([]));

const uniqId = seq();

export const globalDialog = <I, O>(dialog: PopupSpec<I, O>): Promise<O> => new Promise((res, rej) => 
    globalPopupDialogs.update(list => list.concat({
        cancellable: true,
        params: void 0,
        ...dialog,
        id: uniqId(),
        onSelect: res,
        onCancel: rej
    })));

export const globalPopupMenu = <I, O>(menu: PopupSpec<I, O>, referenceEvent: MouseEvent): Promise<O> => {
    const element = referenceEvent.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    const reference: PopupWithContext<I, O>['reference'] = {
        element,
        // clientX and clientY can be zero in case of click events triggered by enter key.
        xOffset: referenceEvent.clientX ? referenceEvent.clientX - (rect.left + rect.width / 2) : void 0,
        yOffset: referenceEvent.clientY ? referenceEvent.clientY - (rect.top + rect.height / 2) : void 0
    };
    return new Promise((res, rej) => 
        globalPopupMenus.update(list => list.concat({
            cancellable: true,
            params: void 0,
            ...menu,
            reference,
            id: uniqId(),
            onSelect: res,
            onCancel: rej
        }))
    );
};

abstract class PopupContainer<T extends Popup<any, any>> extends LitElement {
    abstract popups: MultiStore<T[]>;

    closePopup(id: number, result: CustomEvent<any> | boolean): void {
        this.popups.update(oldPopups => {
            const toRemove = oldPopups.find(item => item.id === id)!;
            if (result instanceof CustomEvent) {
                toRemove.onSelect(result.detail);
            } else {
                toRemove.onCancel(new AvctPopupClosure(result));
            }
            return oldPopups.filter(dialog => dialog !== toRemove);
        });
    }
}

export class AvctDialogContainer extends PopupContainer<Popup<any, any>> {
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
    popups = globalPopupDialogs;

    private handleClose(popupProper: HTMLDivElement, result: CustomEvent<any> | boolean) {
        const id = parseInt(popupProper.dataset['popupId']!);
        this.closePopup(id, result);
    }

    private handleChildSelect(e: CustomEvent<any>): void {
        this.handleClose((e.currentTarget as LitElement).parentNode as HTMLDivElement, e);
    }

    private handleChildClose(e: CustomEvent<void>): void {
        this.handleClose((e.currentTarget as LitElement).parentNode as HTMLDivElement, false);
    }

    private handleCloseButton(e: MouseEvent) {
        this.handleClose(((e.currentTarget as HTMLSpanElement).parentNode as HTMLDivElement).parentNode as HTMLDivElement,  false);
    }

    render(): ReturnType<LitElement['render']> {
        return html`
            <link rel="stylesheet" href="./shared.css" />
            ${asyncReplace(this.popups.value(), value => {
                const list = value as Popup<any, any>[];
                return list.length ? repeat(list, dialog => dialog.id, dialog => html`
                    <div class="dialog-modal">
                        <div class="dialog-proper" data-popup-id="${String(dialog.id)}">
                            <h2><span>${dialog.title}</span>${dialog.cancellable ? html`<button class="round-button" @click="${this.handleCloseButton}">🗙</button>` : null}</h2>
                            <${dialog.type} .params=${dialog.params} @avct-select="${this.handleChildSelect}" @avct-close="${this.handleChildClose}" .params="${dialog.params}" class="dialog-content"></${dialog.type}>
                        </div>
                    </div>
                `) : null;
            })
        }`;
    }
}

const PHI = (Math.sqrt(5) - 1) / 2;

export class AvctMenuRendering<I, O> extends LitElement {
    static styles = css`
        :host {
            position: fixed;
            display: flex;
            justify-content: center;
            z-index: 3;
        }
        .menu-proper {
            width: auto;
            max-width: 80%;
            white-space: nowrap;
            border: 1px solid #999;
            border-radius: 4px;
            box-shadow: 0 0 32px 32px rgba(0, 0, 0, 0.5);
        }
        .menu-proper.auto-close {
            box-shadow: 0 0 32px 8px rgba(0, 0, 0, 0.25);
        }
        h3 {
            overflow-wrap: break-word;
            white-space: normal;
            background-color: #e6ebf3;
            color: #000;
            font-weight: normal;
            border-bottom: 1px solid #c7c7c7;
            font-size: 15px;
            padding: 6px 16px;
            margin: 0;
            border-top-left-radius: 3px;
            border-top-right-radius: 3px;
        }
        .menu-content {
            background-color: #f6f9fd;
            padding: 12px;
            display: block;
            border-bottom-right-radius: 3px;
            border-bottom-left-radius: 3px;
        }
        .arrow {
            position: absolute;
            border-left: 12px solid transparent;
            border-right: 12px solid transparent;
            margin-left: -12px;
        }
        .arrow::after {
            content: '';
            position: absolute;
            border-left: 11px solid transparent;
            border-right: 11px solid transparent;
            left: -11px;
        }
        .arrow.up { top: 100%; border-top: 12px solid #999; }
        .arrow.down { bottom: 100%; border-bottom: 12px solid #999; }
        .arrow.up::after { border-top: 11px solid #f6f9fd; top: -13px; }
        .arrow.down::after { border-bottom: 11px solid #e6ebf3; bottom: -13px; }
    `;

    @property({ attribute: false })
    menu!: PopupWithContext<I, O>;

    @property({ attribute: false })
    parentContainer!: AvctPopupMenuContainer;

    renderedParentState?: DOMRect;

    render(): ReturnType<LitElement['render']> {
        const menu = this.menu;
        const reference = menu.reference;

        // Start: styling.
        const envelopeStyle: Partial<CSSStyleDeclaration> = {};
        const arrowStyle: Partial<CSSStyleDeclaration> = {};
        let arrowClass: string;

        const parentRect = reference.element.getBoundingClientRect();
        const [windowWidth, windowHeight] = [document.documentElement.clientWidth, document.documentElement.clientHeight];

        if (parentRect.top + parentRect.bottom > windowHeight) {
            const offsetFromYCenter = PHI * (reference.yOffset || 0) + (1 - PHI) * (-0.25 * parentRect.height);
            const refY = parentRect.top + parentRect.height / 2 + offsetFromYCenter;
            envelopeStyle.bottom = `${windowHeight - refY + 8}px`;
            arrowClass = 'up';
        } else {
            const offsetFromYCenter = PHI * (reference.yOffset || 0) + (1 - PHI) * (0.25 * parentRect.height);
            const refY = parentRect.top + parentRect.height / 2 + offsetFromYCenter;
            envelopeStyle.top = `${refY + 8}px`;
            arrowClass = 'down';
        }

        const refX = (parentRect.left + parentRect.right) / 2 + (reference.xOffset || 0) * PHI;
        let [envelopeLeft, envelopeRight] = [
            Math.max(0, refX - 150), 
            Math.min(windowWidth, refX + 150)
        ];
        const missing = 300 - (envelopeRight - envelopeLeft);
        if (missing > 0) {
            if (refX * 2 > windowWidth) {
                envelopeLeft = Math.max(0, envelopeLeft - missing);
            } else {
                envelopeRight = Math.min(windowWidth, envelopeRight + missing);
            }
        }

        envelopeStyle.left = `${envelopeLeft}px`;
        envelopeStyle.right = `${windowWidth - envelopeRight}px`;
        arrowStyle.left = `${refX - envelopeLeft}px`;
        // End: styling.

        this.renderedParentState = parentRect;
        
        Object.entries(envelopeStyle).forEach(([k, v]) => {
            (this.style as any)[k] = v;
        })

        return html`
            <div class="${classMap({ 'menu-proper': true, 'auto-close': menu.cancellable })}" data-popup-id="${String(menu.id)}" @mouseenter="${this.handleMouseEnter}" @mouseleave="${this.handleMouseLeave}">
                <h3>${menu.title}</h3>
                <${menu.type} .params=${menu.params} @avct-select="${this.finishCurrentMenu}" @avct-close="${this.abortCurrentMenu}" @avct-touch="${this.touchCurrentMenu}" class="menu-content"></${menu.type}>
            </div>
            <div class="arrow ${arrowClass}" style="${styleMap(arrowStyle as any)}" @mouseenter="${this.handleMouseEnter}" @mouseleave="${this.handleMouseLeave}"></div>
        `;
    }

    private readonly handleMouseEnter = (): void => { this.lastMouseEnter = Date.now(); };
    private readonly handleMouseLeave = (): void => { this.lastMouseLeave = Date.now(); };
    private readonly handleClickOutside = (): void => { this.abortCurrentMenu(); };

    constructor() {
        super();
        this.addEventListener('click', e => e.stopPropagation());
    }

    updated(changedProps: Map<keyof AvctMenuRendering<I, O>, any>): ReturnType<LitElement['updated']> {
        if (changedProps.get('menu') !== void 0) { throw new RangeError('Menu rendering cannot be reused for different menus!'); }
        if (this.animationFrame) { cancelAnimationFrame(this.animationFrame); }
        this.animationFrame = requestAnimationFrame(this.frame);
    }

    connectedCallback(): void {
        super.connectedCallback();
        if (this.menu.cancellable) {
            this.menu.reference.element.addEventListener('mouseenter', this.handleMouseEnter);
            this.menu.reference.element.addEventListener('mouseleave', this.handleMouseLeave);
        }
        requestAnimationFrame(() => document.body.addEventListener('click', this.handleClickOutside));
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        if (this.animationFrame) { cancelAnimationFrame(this.animationFrame); }
        if (this.menu.cancellable) {
            this.menu.reference.element.removeEventListener('mouseenter', this.handleMouseEnter);
            this.menu.reference.element.removeEventListener('mouseleave', this.handleMouseLeave);
        }
        requestAnimationFrame(() => document.body.removeEventListener('click', this.handleClickOutside));
    }

    private readonly frame = (): void => {
        this.animationFrame = void 0;
        const parent = this.menu.reference.element.getBoundingClientRect();
        if (!this.renderedParentState) { return; }
        // Killing.
        if (this.menu.cancellable && (this.lastMouseLeave > this.lastMouseEnter) && (Date.now() - this.lastMouseLeave > 50)) {
            this.abortCurrentMenu();
            return;
        }
        // Scroll following.
        if ((['top', 'left', 'width', 'height'] as (keyof DOMRect)[]).every(key => parent[key] === this.renderedParentState![key])) {
            this.animationFrame = requestAnimationFrame(this.frame);
            return;
        }
        console.debug(`Menu ${this.menu.id} need rerendering...`);
        this.requestUpdate();
    };

    private animationFrame?: ReturnType<Window['requestAnimationFrame']>;
    private lastMouseEnter = 0;
    private lastMouseLeave = 0;

    private touched = false;
    private finishCurrentMenu(e: CustomEvent<O>): void { this.parentContainer.closePopup(this.menu.id, e); }
    private abortCurrentMenu(): void { this.parentContainer.closePopup(this.menu.id, this.touched); }
    private touchCurrentMenu(): void { this.touched = true; }
}

export class AvctPopupMenuContainer extends PopupContainer<PopupWithContext<any, any>> {
    @property({ attribute: false })
    popups = globalPopupMenus;

    render(): ReturnType<LitElement['render']> {
        return asyncReplace(this.popups.value(), value => {
            const list = value as PopupWithContext<any, any>[];
            return list.length ? repeat(list, menu => menu.id, menu => html`<${AvctMenuRendering} .menu="${menu}" .parentContainer="${this}"></${AvctMenuRendering}>`) : null;
        });
    }
}

export class AvctCtxMenuHook<I, O> extends LitElement {
    @property({ attribute: false })
    autoClose = false;

    @property({ attribute: false })
    factory!: PopupConstructor<I, O>;

    @property({ attribute: false })
    params!: I;

    @property({ attribute: false })
    title = 'Details';

    private active = false;

    registeredParent?: HTMLElement;

    private static findEffctiveOffsetParent(from: Node | null): HTMLElement {
        let current: Node | null = from;
        while (current) {
            if (current.nodeType === 11) {
                current = (current as ShadowRoot).host;
            }
            if (current.nodeType === 1) {
                if ((current as HTMLElement).classList.contains('ctx-menu-host')) {
                    return current as HTMLElement;
                }
            }
            current = current.parentNode;
        }
        throw new RangeError('Context menu host not found');
    }

    connectedCallback(): ReturnType<LitElement['connectedCallback']> {
        super.connectedCallback();
        this.registeredParent = AvctCtxMenuHook.findEffctiveOffsetParent(this.parentNode);
        this.registeredParent.addEventListener('mouseenter', this.parentMouseEnter);
    }

    disconnectedCallback(): ReturnType<LitElement['disconnectedCallback']>  {
        super.disconnectedCallback();
        this.registeredParent?.removeEventListener('mouseenter', this.parentMouseEnter);
        this.registeredParent = void 0;
    }

    private readonly parentMouseEnter = (e: MouseEvent): void => {
        if (this.active) { return; }
        this.active = true;
        globalPopupMenu({
            type: this.factory,
            params: this.params,
            title: this.title,
        }, e).then(
            detail => this.dispatchEvent(new CustomEvent<O>('avct-select', { detail })),
            () => this.dispatchEvent(new CustomEvent<void>('avct-close'))
        ).finally(() => { this.active = false; });
    };
}