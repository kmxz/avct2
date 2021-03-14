var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, css } from 'lit-element/lit-element.js';
import { html } from '../registry';
import { MultiStore } from '../model';
import { property } from 'lit-element/decorators/property.js';
import { asyncReplace } from 'lit-html/directives/async-replace.js';
import { seq } from './utils';
import { repeat } from 'lit-html/directives/repeat.js';
const DURATION = 5000;
const globalToasts = new MultiStore(Promise.resolve([]));
const uniqId = seq();
export const globalToast = (text) => globalToasts.update(list => list.concat({ text, since: Date.now(), id: uniqId() }));
export class AvctToastContainer extends LitElement {
    constructor() {
        super(...arguments);
        this.toaster = globalToasts;
        this.cleanup = () => {
            this.toaster.update(list => {
                if (!list.length) {
                    return list;
                }
                const removeBefore = Date.now() - DURATION;
                let i = 0;
                for (; i < list.length; i++) {
                    if (list[i].since >= removeBefore) {
                        break;
                    }
                }
                return list.slice(i);
            });
        };
    }
    render() {
        return html `${asyncReplace(this.toaster.value(), value => {
            const list = value;
            if (!list.length) {
                return null;
            }
            const ttl = list[0].since + DURATION - Date.now();
            setTimeout(this.cleanup, Math.max(0, ttl));
            return repeat(list, toast => toast.id, toast => html `<div>${toast.text}</div>`);
        })}`;
    }
}
AvctToastContainer.styles = css `
        :host {
            position: fixed;
            bottom: 0;
            width: 100%;
        }
        div {
            width: 280px;
            background: rgba(0, 0, 0, 0.75);
            color: #fff;
            text-align: center;
            padding: 12px 16px;
            line-height: 20px;
            margin: 1px auto 0;
        }
        div:first-child {
            border-top-left-radius: 4px;
            border-top-right-radius: 4px;
        }
    `;
__decorate([
    property({ attribute: false })
], AvctToastContainer.prototype, "toaster", void 0);
