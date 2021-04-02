import { LitElement, css, TemplateResult } from 'lit-element/lit-element.js';
import { property } from 'lit-element/decorators/property.js';
import { html } from '../components/registry';
import { Clip, clips, tags } from '../data';
import { DialogBase } from '../components/dialog';
import { until } from 'lit-html/directives/until.js';
import { asyncReplace } from 'lit-html/directives/async-replace.js';
import { MultiStore, TagJson } from '../model';
import { AvctCtxMenu } from '../components/menu';
import { AvctClipPlay } from '../menus/clip-play';
import { sendTypedApi } from '../api';

class AvctBestOfTagDialogInner extends LitElement {
    createRenderRoot(): ReturnType<LitElement['createRenderRoot']> { return this; }

    @property({ attribute: false })
    tag?: TagJson;

    @property({ attribute: false })
    clips?: Map<number, Clip>;

    @property({ attribute: false })
    clip!: number;

    render(): ReturnType<LitElement['render']> {
        if (!this.tag || !this.clips) { return 'Loading...' }
        const renderRow = (title: string, clipObj: Clip | undefined): TemplateResult => html`
            <tr>
                <td>${title}</td>
                <td class="ctx-menu-host">${clipObj ? html`${clipObj.getFile()}<${AvctCtxMenu} title="Play ${clipObj.getFile()}"><${AvctClipPlay} .clipId="${clipObj.id}" .path="${clipObj.path}" insideSpecial></${AvctClipPlay}></${AvctCtxMenu}>` : '(not set)'}</td>
                <td>${clipObj?.hasThumb ? until(clipObj.getThumb().then(str => html`<img src="${str}" />`), html`<span loading></span>`) : '(none)'}</td>   
            </tr>
        `;

        return html`
            <table>
                ${renderRow('Old', this.tag.best ? this.clips.get(this.tag.best) : void 0)}
                ${renderRow('New', this.clips.get(this.clip))}
            </table>
        `;
    }
}


export class AvctBestOfTagDialog extends DialogBase<{ tag: number; clip: number }, boolean> {
    static styles = css`
        table {
            border-collapse: collapse;
        }
        td {
            border: 1px solid #e0e0e9;
            padding: 8px;
        }
        footer {
            margin-top: 8px;
            text-align: center;
        }
        img { max-width: 360px; }
    `;

    private doSubmit(e: CustomEvent<number>): void {
        this.done(!!parseInt((e.target as HTMLButtonElement).value));
    }

    render(): ReturnType<LitElement['render']> {
        return html`
            <link rel="stylesheet" href="./shared.css" />
            <${AvctBestOfTagDialogInner} .clips="${asyncReplace(clips.value())}" .tag="${asyncReplace(tags.value(), tagsMap => (tagsMap as Map<number, TagJson>).get(this.params.tag))}" .clip="${this.params.clip}"></${AvctBestOfTagDialogInner}>
            <footer>
                <button @click="${this.doSubmit}" value="0">Don't change</button>
                <button @click="${this.doSubmit}" value="1">Confirm change</button>
            </footer>
        `;
    }
}
