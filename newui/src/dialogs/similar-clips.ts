import { css, LitElement } from 'lit-element/lit-element.js';
import { property } from 'lit-element/decorators/property.js';
import { html } from '../components/registry';
import { sendTypedApi } from '../api';
import { AvctCtxMenuHook, PopupBase } from '../components/dialog';
import { until } from 'lit-html/directives/until.js';
import { clips } from '../data';
import { AvctClipPlay } from '../menus/clip-play';

class AvctScoreDetailsMenu extends PopupBase<Record<string, number>, void> {
    static styles = css`
        :host { display: block; text-align: center; }
        table {
            border-collapse: collapse;
        }
    `;

    render(): ReturnType<LitElement['render']> {
        return html`
            <table>
                <tbody>
                    ${Object.entries(this.params).map(([k, v]) => html`<tr><td>${k}:</td><td align="right">${v.toFixed(3)}</td></tr>`)}
                </tbody>
            </table>
        `;
    }
}

export class AvctSimilarClipsDialog extends PopupBase<number, void> {
    static styles = css`
        :host { display: block; text-align: center; }
        table {
            border-collapse: collapse;
        }
        table {
            margin: 0 -16px;
        }
        tr > th, tr > td { position: relative; border-bottom: 1px solid #e0e0e0; padding: 2px; }
        tr > td:first-of-type { padding-left: 12px; }
        tr > td:last-of-type { padding-right: 12px; }
        img { max-width: 360px; }
        tr:first-of-type {
            background: #f6f9fd;
        }
    `;

    @property({ attribute: false })
    private apiResponse?: Promise<{ clipId: number; scores: Record<string, number>; total: number }[]>;

    updated(changedProps: Map<keyof AvctSimilarClipsDialog, any>): ReturnType<LitElement['updated']> {
        if (changedProps.has('params')) {
            this.apiResponse = sendTypedApi('clip/$/similar', { id: this.params });
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
                <table>
                    <thead><tr><th>Clip</th><th>Thumb</th><th>Note</th><th>Similarity</th></tr></thead>
                    <tbody>
                        ${list.map(([tuple, clipObj]) => html`
                            <tr>
                                <td class="ctx-menu-host">${clipObj.getFile()}<${AvctCtxMenuHook} .title="Play ${clipObj.getFile()}" .factory="${AvctClipPlay}" .params="${{ clipId: clipObj.id, path: clipObj.path, insideSpecial: true }}"></${AvctCtxMenuHook}></td>
                                <td>${clipObj.hasThumb ? until(clipObj.getThumb().then(str => html`<img src="${str}" />`), html`<span loading></span>`) : '(none)'}</td>
                                <td>${clipObj.note}</td>
                                <td class="ctx-menu-host">
                                    ${tuple.total}
                                    <${AvctCtxMenuHook} .title="Score details" .factory="${AvctScoreDetailsMenu}" .params="${tuple.scores}"></${AvctCtxMenuHook}>
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
