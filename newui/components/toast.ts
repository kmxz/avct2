import { LitElement, css } from 'lit-element/lit-element.js';
import { html } from 'lit-html/static.js';
import { customElement } from 'lit-element/decorators/custom-element.js';
import { AvctToastContainerElementKey } from '../registry';
import { MultiStore } from '../model';
import { property } from 'lit-element/decorators/property.js';
import { asyncReplace } from 'lit-html/directives/async-replace.js';
import { seq } from './utils';
import { repeat } from 'lit-html/directives/repeat.js';

interface Toast {
    id: number;
    text: string;
    since: number;
}

const DURATION = 5000;
const globalToasts = new MultiStore<Toast[]>(Promise.resolve([]));

const uniqId = seq();
export const globalToast = (text: string): void => globalToasts.update(list => list.concat({ text, since: Date.now(), id: uniqId() }));

@customElement(AvctToastContainerElementKey)
export class AvctToastContainerElement extends LitElement {
    static styles = css`
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

    @property({ attribute: false })
    toaster = globalToasts;

    private readonly cleanup = (): void => {
        this.toaster.update(list => {
            if (!list.length) { return list; }
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

    render() {
        return html`${asyncReplace(this.toaster.value(), value => {
            const list = value as Toast[];
            if (!list.length) { return null; }
            const ttl = list[0].since + DURATION - Date.now();
            setTimeout(this.cleanup, Math.max(0, ttl));
            return repeat(list, toast => toast.id, toast => html`<div>${toast.text}</div>`);
        })}`;
    }
}