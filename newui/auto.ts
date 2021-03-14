
import { Constructor, ClassDescriptor } from '@lit/reactive-element/decorators/base.js';

declare module '@lit/reactive-element/decorators/base.js' {
  interface ClassDescriptor {
    name: string | undefined; // Name field will be provided per https://github.com/tc39/proposal-decorators.
  }
}

const toKebabCase = (className: string) => className.split(/(?=[A-Z])/).join('-').toLowerCase();

const legacyCustomElement = (
  tagName: string,
  clazz: Constructor<HTMLElement>
) => {
  window.customElements.define(tagName, clazz);
  // Cast as any because TS doesn't recognize the return type as being a
  // subtype of the decorated class when clazz is typed as
  // `Constructor<HTMLElement>` for some reason.
  // `Constructor<HTMLElement>` is helpful to make sure the decorator is
  // applied to elements however.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return clazz as any;
};

const standardCustomElement = (
  tagName: string,
  descriptor: ClassDescriptor
) => {
  const {kind, elements} = descriptor;
  return {
    kind,
    elements,
    // This callback is called once the class is otherwise fully defined
    finisher(clazz: Constructor<HTMLElement>) {
      window.customElements.define(tagName, clazz);
    },
  };
};

/**
 * Class decorator factory that defines the decorated class as a custom element.
 *
 * ```
 * @autoCustomElement()
 * class MyElement {
 *   render() {
 *     return html``;
 *   }
 * }
 * ```
 * @category Decorator
 * @param tagName The name of the custom element to define.
 */
export const autoCustomElement = () => (
  classOrDescriptor: Constructor<HTMLElement> | ClassDescriptor
) =>
  typeof classOrDescriptor === 'function'
    ? legacyCustomElement(toKebabCase(classOrDescriptor.name), classOrDescriptor)
    : standardCustomElement(toKebabCase(classOrDescriptor.name), classOrDescriptor);
