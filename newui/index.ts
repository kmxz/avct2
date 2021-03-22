import { LitElement, css } from 'lit-element/lit-element.js';
import { property } from 'lit-element/decorators/property.js';
import { clips, tags } from './data';
import { html } from './components/registry';  
import { asyncReplace } from 'lit-html/directives/async-replace.js';

// Imports for custom element definitions.
import './components/dialog';
import './components/table';
import './tags';
import './clips';
import './components/menu';
import './menus';
import './components/toast';
import './dialogs';
import { AvctDialogContainer, globalDialog } from './components/dialog';
import { AvctClips } from './clips';
import { AvctToastContainer } from './components/toast';

export class AvctRootElement extends LitElement {
  render(): ReturnType<LitElement['render']> {
    return html`
      <div id="main">
        <${AvctClips} .clips="${asyncReplace(clips.value())}" .tags="${asyncReplace(tags.value())}"></${AvctClips}>
      </div>
      <${AvctDialogContainer}></${AvctDialogContainer}>
      <${AvctToastContainer}></${AvctToastContainer}>
    `;
  }

  createRenderRoot() { return this; }
}

window.customElements.define('avct-root', AvctRootElement);