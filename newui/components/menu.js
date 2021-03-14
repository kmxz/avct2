var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, css } from 'lit-element/lit-element.js';
import { html } from '../registry';
import { property } from 'lit-element/decorators/property.js';
import { styleMap } from 'lit-html/directives/style-map.js';
export class AvctCtxMenu extends LitElement {
    constructor() {
        super(...arguments);
        // Not read. For CSS only.
        this.title = 'Detail';
        this.shown = false;
        // Not read. For CSS only.
        this.shadow = false;
        this.leftCompensate = 0;
        this.parentMouseEnter = () => {
            this.shown = true;
        };
        this.parentMouseLeave = () => {
            this.shown = false;
            this.dispatchEvent(new CustomEvent('avct-close'));
        };
    }
    update(changedParams) {
        if (changedParams.has('shown') && this.shown) {
            this.setDirections();
        }
        super.update(changedParams);
    }
    connectedCallback() {
        super.connectedCallback();
        this.registeredParent = this.offsetParent;
        this.registeredParent.addEventListener('mouseenter', this.parentMouseEnter);
        this.registeredParent.addEventListener('mouseleave', this.parentMouseLeave);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this.registeredParent?.removeEventListener('mouseenter', this.parentMouseEnter);
        this.registeredParent?.removeEventListener('mouseleave', this.parentMouseLeave);
        this.registeredParent = void 0;
    }
    setDirections() {
        const parentRect = this.registeredParent.getBoundingClientRect();
        const windowWidth = document.documentElement.clientWidth;
        const windowHeight = document.documentElement.clientHeight;
        this.direction = (parentRect.top + parentRect.bottom > windowHeight) ? 'up' : 'down';
        const xCenter = (parentRect.left + parentRect.right) / 2;
        const onLeftHalf = xCenter < windowWidth / 2;
        this.leftCompensate = onLeftHalf ? Math.max(0, 144 - xCenter) : Math.min(0, windowWidth - xCenter - 144);
    }
    render() {
        this.style.left = `calc(50% + ${this.leftCompensate}px)`;
        const arrowStyle = styleMap({ left: `calc(50% - ${this.leftCompensate}px)` });
        return this.shown ? html `
            <div class="proper"><slot></slot></div>
            <div class="arrow" style="${arrowStyle}"></div>
        ` : null;
    }
}
AvctCtxMenu.styles = css `
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
__decorate([
    property({ type: String, reflect: true })
], AvctCtxMenu.prototype, "title", void 0);
__decorate([
    property({ type: Boolean, reflect: true })
], AvctCtxMenu.prototype, "shown", void 0);
__decorate([
    property({ type: Boolean, reflect: true })
], AvctCtxMenu.prototype, "shadow", void 0);
__decorate([
    property({ type: String, reflect: true })
], AvctCtxMenu.prototype, "direction", void 0);
