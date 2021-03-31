import { css, LitElement } from 'lit-element/lit-element.js';
import { property } from 'lit-element/decorators/property.js';
import { html } from '../components/registry';
import { send } from '../api';
import { DialogBase } from '../components/dialog';
import { until } from 'lit-html/directives/until.js';
import { clips } from '../data';
import { AvctClipPlay } from '../menus/clip-play';
import { AvctCtxMenu } from '../components/menu';

export class AvctSimilarClipsDialog extends DialogBase<number, void> {
    static styles = css`
        :host { display: block; text-align: center; }
        table {
            border-collapse: collapse;
        }
        table.main {
            margin: 0 -16px;
        }
        tr.main > th, tr.main > td { position: relative; border-bottom: 1px solid #e0e0e0; padding: 2px; }
        tr.main > td:first-of-type { padding-left: 12px; }
        tr.main > td:last-of-type { padding-right: 12px; }
        img { max-width: 360px; }
        tr.main:first-of-type {
            background: #f6f9fd;
        }
    `;

    @property({ attribute: false })
    private apiResponse?: Promise<{ clipId: number; scores: Record<string, number>; total: number }[]>;

    updated(changedProps: Map<keyof AvctSimilarClipsDialog, any>): ReturnType<LitElement['updated']> {
        if (changedProps.has('params')) {
            this.apiResponse = send('clip/similar', { id: this.params });
        }
    }

    render(): ReturnType<LitElement['render']> {
        if (!this.apiResponse) { return 'Loading not started...'; }
        const clipId = this.params;
        return html`
            ${until(this.apiResponse.then(async (similarClips) => {
            const localClipsData = (await clips.value().next()).value;
            return [
                [{ clipId, scores: { 'Reference clip itself': Number.POSITIVE_INFINITY }, total: Number.POSITIVE_INFINITY }, localClipsData.get(clipId)!] as const,
                ...similarClips.map(tuple => [tuple, localClipsData.get(tuple.clipId)!] as const)
            ];
        }).then(list => html`
                <table class="main">
                    <thead><tr><th>Clip</th><th>Thumb</th><th>Note</th><th>Similarity</th></tr></thead>
                    <tbody>
                        ${list.map(([tuple, clipObj]) => html`
                            <tr class="main">
                                <td class="ctx-menu-host">${clipObj.getFile()}<${AvctCtxMenu} title="Play ${clipObj.getFile()}"><${AvctClipPlay} .clipId="${clipObj.id}" .path="${clipObj.path}" insideSpecial></${AvctClipPlay}></${AvctCtxMenu}></td>
                                <td>${clipObj.hasThumb ? until(clipObj.getThumb().then(str => html`<img src="${str}" />`), html`<span loading></span>`) : '(none)'}</td>
                                <td>${clipObj.note}</td>
                                <td class="ctx-menu-host">
                                    ${tuple.total}
                                    <${AvctCtxMenu} title="Score details">
                                        <table>
                                            <tbody>
                                                ${Object.entries(tuple.scores).map(([k, v]) => html`<tr><td>${k}</td><td align="right">${v.toFixed(3)}</td></tr>`)}
                                            </tbody>
                                        </table>
                                    </${AvctCtxMenu}>
                                </td>
                            </tr>
                        `)}
                    </tbody>
                </table>
                <br />
                Only first 25 entries are shown.
            `), html`<span loading>Loading clips...</span>`)}
        `;
    }
}
