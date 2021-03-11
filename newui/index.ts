import { LitElement, css } from 'lit-element/lit-element.js';
import { html } from 'lit-html/static.js';
import { customElement } from 'lit-element/decorators/custom-element.js';
import { property } from 'lit-element/decorators/property.js';
import { clips, tags } from './data';
import { AvctClips, AvctToastContainer } from './registry';  
import { asyncReplace } from 'lit-html/directives/async-replace.js';

// Imports for custom element definitions.
import './table';
import './tags';
import './clips';
import './menu';
import './menus';
import './toast';

/**
 * An example element.
 *
 * @slot - This element has a slot
 * @csspart button - The button
 */
@customElement('my-element')
export class MyElement extends LitElement {
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
      <${AvctToastContainer}></${AvctToastContainer}>
    `;
  }

  private _onClick() {
    this.count++;
  }

  foo(): string {
    return 'foo';
  }

  constructor() {
    super();
  }

  createRenderRoot() { return this; }
}