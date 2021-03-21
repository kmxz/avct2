import { html as litHtml, LitElement } from 'lit-element/lit-element.js';
import takeCareOf from 'carehtml';

export type Constructor<T> = {
    new (...args: any[]): T;
};

export const html = takeCareOf(litHtml);

export type ElementType = Constructor<LitElement>;