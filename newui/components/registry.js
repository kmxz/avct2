import { LitElement } from 'lit-element/lit-element.js';
import { html as staticHtml, unsafeStatic } from 'lit-html/static.js';
const registeredElements = new Map();
const toDashCase = (name) => {
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
};
const getClassUniqueTag = (klass) => {
    const wrapped = registeredElements.get(klass);
    if (wrapped) {
        return wrapped;
    }
    const tag = toDashCase(klass.name);
    customElements.define(tag, klass);
    const ret = unsafeStatic(tag);
    registeredElements.set(klass, ret);
    return ret;
};
export const html = (strings, ...values) => {
    const newValues = values.map((entry) => {
        if (!entry || !(entry.prototype instanceof LitElement)) {
            return entry;
        }
        return getClassUniqueTag(entry);
    });
    return staticHtml(strings, ...newValues);
};
