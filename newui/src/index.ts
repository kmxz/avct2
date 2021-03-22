import { LitElement } from 'lit-element/lit-element.js';
import { clips, tags } from './data';
import { html } from './components/registry';  
import { asyncReplace } from 'lit-html/directives/async-replace.js';

// Imports for custom element definitions.
import { AvctDialogContainer } from './components/dialog';
import { AvctClips } from './clips';
import { AvctToastContainer } from './components/toast';

export class AvctRootElement extends LitElement {
  render(): ReturnType<LitElement['render']> {
    return html`
      <${AvctClips} .clips="${asyncReplace(clips.value())}" .tags="${asyncReplace(tags.value())}"></${AvctClips}>
      <${AvctDialogContainer}></${AvctDialogContainer}>
      <${AvctToastContainer}></${AvctToastContainer}>
    `;
  }

  createRenderRoot(): ReturnType<LitElement['createRenderRoot']> { return this; }
}

window.customElements.define('avct-root', AvctRootElement);