import { LitElement, TemplateResult } from 'lit-element/lit-element.js';
import { html as staticHtml, unsafeStatic } from 'lit-html/static.js';

export type Constructor<T> = {
    new (...args: any[]): T;
};

type WrappedStatic = ReturnType<typeof unsafeStatic>;

const registeredElements = new Map<Constructor<LitElement>, WrappedStatic>();

const toDashCase = (name: string): string => {
    const dashCaseLetters = [];
    for (let i = 0; i < name.length; i += 1) {
        const letter = name[i];
        const letterLowerCase = letter.toLowerCase();
        if (letter !== letterLowerCase && i !== 0) {
            dashCaseLetters.push('-');
        }
        dashCaseLetters.push(letterLowerCase);
    }
    return dashCaseLetters.join('');
}
  
const getClassUniqueTag = (klass: Constructor<LitElement>): WrappedStatic => {
    const wrapped = registeredElements.get(klass);
    if (wrapped) {
        return wrapped;
    }
    const tag = toDashCase(klass.name);
    customElements.define(tag, klass); // Let errors be thown if there are duplicates.
    const ret = unsafeStatic(tag);
    registeredElements.set(klass, ret);
    return ret;
}

export const html = (strings: TemplateStringsArray, ...values: unknown[]): TemplateResult => {
    const newValues = values.map((entry: any) => {
        if (!entry || !(entry.prototype instanceof LitElement)) {
            return entry;
        }
        return getClassUniqueTag(entry);
    });    
    return staticHtml(strings, ...newValues);
};

export type ElementType = Constructor<LitElement>;
