import { LitElement, css } from 'lit-element/lit-element.js';
import { customElement } from 'lit-element/decorators/custom-element.js';
import { AvctCtxMenuElementKey } from './registry';
import { property } from 'lit-element/decorators/property.js';
import { html } from 'lit-html/static.js';

@customElement(AvctCtxMenuElementKey)
export class AvctCtxMenuElement extends LitElement {
    static styles = css`
        :host {
            display: inline-block;
        }
        h3 {
            background-color: #e6ebf3;
            color: #000;
            margin: 0;
            font-weight: normal;
            border-bottom: 1px solid #c7c7c7;
            font-size: 15px;
            padding: 6px 16px;
            margin-bottom: -4px;
        }
        .up, .down {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            width: auto;
            white-space: nowrap;
            min-width: 72px;
            max-width: 480px;
            border: 1px solid #bdbdbd;
            background-color: #f6f9fd;
            z-index: 100;
            border-radius: 4px;
        }
        .up::before, .down::before {
            border-left: 12px solid transparent;
            border-right: 12px solid transparent;
            margin-left: -12px;
        }
        .up::after, .down::after {
            border-left: 11px solid transparent;
            border-right: 11px solid transparent;
            margin-left: -11px;
        }
        .up::before { border-top: 12px solid #bdbdbd; }
        .down::before { border-bottom: 12px solid #bdbdbd; }
        .up::after { border-top: 11px solid #f6f9fd; }
        .down::after { border-bottom: 11px solid #e6ebf3; }
        .up::before, .down::before, .up::after, .down::after {
            content: '';
            position: absolute;
            left: 50%;
        }
        .up {
            bottom: calc(75% + 8px);
        }
        .up::before, .up::after {
            top: 100%;
        }
        .down {
            top: calc(75% + 8px);
        }
        .down::before, .down::after {
            bottom: 100%;
        }
    `;

    @property({ type: String })
    title = 'Detail';

    @property({ type: Boolean, reflect: true })
    shown = false;

    registeredParent?: HTMLElement;

    connectedCallback() {
        super.connectedCallback();
        this.registeredParent = this.offsetParent as HTMLElement;
        this.registeredParent.addEventListener('mouseenter', this.parentMouseEnter);
        this.registeredParent.addEventListener('mouseleave', this.parentMouseLeave);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.registeredParent?.removeEventListener('mouseenter', this.parentMouseEnter);
        this.registeredParent?.removeEventListener('mouseleave', this.parentMouseLeave);
        this.registeredParent = undefined;
    }

    private readonly parentMouseEnter = (e: MouseEvent): void => {
        this.shown = true;
    };

    private readonly parentMouseLeave = (e: MouseEvent): void => {
        this.shown = false;
        this.dispatchEvent(new CustomEvent<void>('avct-close'));
    };

    shouldPointUpward(): boolean {
        const parentRect = this.registeredParent!.getBoundingClientRect();
        const windowHeight = document.documentElement.clientHeight;
        return parentRect.top + parentRect.bottom > windowHeight;
    }

    render() {
        return this.shown ? html`<div class="${this.shouldPointUpward() ? 'up' : 'down'}">
            <h3>${this.title}</h3>
            <slot></slot>
        </div>` : null;
    }
}