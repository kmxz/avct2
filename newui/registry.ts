import { html as litHtml, LitElement } from 'lit-element/lit-element.js';
import takeCareOf from 'carehtml';

// Note: this file can be replaced w/ an annotation once https://github.com/microsoft/TypeScript/issues/40805 is done.
 
export const html = takeCareOf(litHtml);

type Constructor<T> = {
    new (...args: any[]): T;
};

export type ElementType = Constructor<LitElement>;