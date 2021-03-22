import { LitElement, css, PropertyValues } from 'lit-element/lit-element.js';
import { html } from './registry';
import { property } from 'lit-element/decorators/property.js';
import { styleMap } from 'lit-html/directives/style-map.js'

export class AvctCtxMenu extends LitElement {
    static styles = css`
        :host {
            position: absolute;
        }
        ::slotted(*) {
            position: relative;
        }
        :host([shown]) {
            background-color: #f6f9fd;
            left: 50%;
            transform: translateX(-50%);
            width: auto;
            white-space: nowrap;
            min-width: 120px;
            max-width: 280px;
            border: 1px solid #999;
            z-index: 100;
            border-radius: 4px;
            display: block;
        }
        :host([shown])::before {
            content: attr(title);
            overflow-wrap: break-word;
            white-space: normal;
            display: block;
            background-color: #e6ebf3;
            color: #000;
            margin: 0;
            font-weight: normal;
            border-bottom: 1px solid #c7c7c7;
            font-size: 15px;
            padding: 6px 16px;
            margin-bottom: -4px;
            border-top-left-radius: 4px;
            border-top-right-radius: 4px;
        }
        :host([shadow][shown])::after {
            content: '';
            display: block;
            position: absolute;
            left: -120px; right: -120px; top: -120px; bottom: -120px;
            background: radial-gradient(closest-side, rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0));
            z-index: -1;
            border-radius: 50%;
        }
        .proper {
            background-color: #f6f9fd;
            padding: 12px;
            border-radius: 4px;
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
        :host([direction="up"]) .arrow { top: 100%; border-top: 12px solid #999; }
        :host([direction="down"]) .arrow { bottom: 100%; border-bottom: 12px solid #999; }
        :host([direction="up"]) .arrow::after { border-top: 11px solid #f6f9fd; top: -12px; }
        :host([direction="down"]) .arrow::after { border-bottom: 11px solid #e6ebf3; bottom: -12px; }
        :host([direction="up"]) {
            bottom: calc(75% + 8px);
        }
        :host([direction="down"]) {
            top: calc(75% + 8px);
        }
    `;

    // Not read. For CSS only.
    @property({ type: String, reflect: true })
    title = 'Detail';

    @property({ type: Boolean, reflect: true })
    shown = false;

    // Not read. For CSS only.
    @property({ type: Boolean, reflect: true })
    shadow = false;

    // Not read. For CSS only.
    @property({ type: String, reflect: true })
    direction?: string;

    private leftCompensate = 0;

    update(changedParams: PropertyValues): void {
        if (changedParams.has('shown') && this.shown) {
            this.setDirections();
        }
        super.update(changedParams);
    }

    registeredParent?: HTMLElement;

    connectedCallback(): ReturnType<LitElement['connectedCallback']> {
        super.connectedCallback();
        this.registeredParent = this.offsetParent as HTMLElement;
        this.registeredParent.addEventListener('mouseenter', this.parentMouseEnter);
        this.registeredParent.addEventListener('mouseleave', this.parentMouseLeave);
    }

    disconnectedCallback(): ReturnType<LitElement['disconnectedCallback']>  {
        super.disconnectedCallback();
        this.registeredParent?.removeEventListener('mouseenter', this.parentMouseEnter);
        this.registeredParent?.removeEventListener('mouseleave', this.parentMouseLeave);
        this.registeredParent = void 0;
    }

    private readonly parentMouseEnter = (): void => {
        this.shown = true;
    };

    private readonly parentMouseLeave = (): void => {
        this.shown = false;
        this.dispatchEvent(new CustomEvent<void>('avct-close'));
    };

    setDirections(): void {
        const parentRect = this.registeredParent!.getBoundingClientRect();
        const windowWidth = document.documentElement.clientWidth;
        const windowHeight = document.documentElement.clientHeight;
        this.direction = (parentRect.top + parentRect.bottom > windowHeight) ? 'up' : 'down';
        const xCenter = (parentRect.left + parentRect.right) / 2;
        const onLeftHalf = xCenter < windowWidth / 2;
        this.leftCompensate = onLeftHalf ? Math.max(0, 120 - xCenter) : Math.min(0, windowWidth - xCenter - 120);
    }

    render(): ReturnType<LitElement['render']> {
        this.style.left = `calc(50% + ${this.leftCompensate}px)`;
        return this.shown ? html`
            <div class="proper"><slot></slot></div>
            <div class="arrow" style="${styleMap({ left: `calc(50% - ${this.leftCompensate}px)` })}"></div>
        ` : null;
    }
}