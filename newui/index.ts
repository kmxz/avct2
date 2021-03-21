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

/**
 * An example element.
 *
 * @slot - This element has a slot
 * @csspart button - The button
 */
export class RootElement extends LitElement {
  static styles = css`
    :host {
      display: block;
      border: solid 1px gray;
      padding: 16px;
      max-width: 800px;
    }
  `;

  /**
   * The name to say "Hello" to.
   */
  @property()
  name = 'World';

  /**
   * The number of times the button has been clicked.
   */
  @property({type: Number})
  count = 0;

  render() {
    return html`
      <h1>Hello, ${this.name}!</h1>
      <button @click=${this._onClick} part="button">
        Click Count: ${this.count}
      </button>
      <${AvctClips} .clips="${asyncReplace(clips.value())}" .tags="${asyncReplace(tags.value())}"></${AvctClips}>
      <${AvctDialogContainer}></${AvctDialogContainer}>
      <${AvctToastContainer}></${AvctToastContainer}>
    `;
  }

  private _onClick() {
    this.count++;
  }

  constructor() {
    super();
  }

  createRenderRoot() { return this; }
}

window.customElements.define('avct-root', RootElement);