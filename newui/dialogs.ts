import { css } from 'lit-element/lit-element.js';
import { property } from 'lit-element/decorators/property.js';
import { html } from './components/registry';
import { send } from './api';
import { DialogBase } from './components/dialog';
import { loadImgToCover, loadImgUrlToCover } from './components/canvas-util';
import { query } from '@lit/reactive-element/decorators/query.js';
import { until } from 'lit-html/directives/until.js';
import { clips } from './data';
import { AvctClipPlay } from './menus';
import { AvctCtxMenu } from './components/menu';

export class AvctClipsUpdates extends DialogBase<{ added: string[], disappeared: string[] }, void> {
    static styles = css`
        h3 {
            font-size: 15px;
            margin: 16px 0 12px;
        }
        p {
            margin: 12px 0;
        }
        ul {
            margin: 0;
        }
    `;

    render(): ReturnType<LitElement['render']> {
        if (!this.params) { return null; }
        return html`
            ${this.params.added.length ? html`<h3>Files added</h3><p>Those clips are just added. Refresh to see them.</p><ul>${this.params.added.map(item => html`<li>${item}</li>`)}</ul>` : null}
            ${this.params.disappeared.length ? html`<h3>Files disappeared</h3><p>Those clips have disappeared from the directory.</p><ul>${this.params.disappeared.map(item => html`<li>${item}</li>`)}</ul>` : null}
        `;
    }
}

export class AvctClipHistoryDialog extends DialogBase<number, void> {
    static styles = css`
        :host { display: block; position: relative; min-height: 20px; }
        ul { margin: 0; }
    `;

    @property({ attribute: false })
    history?: number[];    

    @property({ reflect: true, type: Boolean })
    loading = true;

    private static ymdhis(dateSec: number): string {
        const zerofill = (num: number) => { return ('0' + num).slice(-2); }
        const date = new Date(dateSec * 1000);
        return date.getFullYear() + '-' + zerofill(date.getMonth() + 1) + '-' + zerofill(date.getDate()) + ' ' + zerofill(date.getHours()) + ':' + zerofill(date.getMinutes()) + ':' + zerofill(date.getSeconds());
    };

    updated(changedProps: Map<keyof AvctClipHistoryDialog, any>) {
        if (changedProps.has('params')) {
            this.loading = true;
            send('clip/history', { id: this.params }).then((response: number[]) => {
                this.loading = false;
                this.history = response;
            });
        }
    }

    render(): ReturnType<LitElement['render']> {
        return html`<link rel="stylesheet" href="./shared.css" /><ul>${this.history?.map(item => html`<li>${AvctClipHistoryDialog.ymdhis(item)}</li>`)}</ul>`;
    }
}

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
    private apiResponse?: Promise<{ clipId: number, scores: Record<string, number>, total: number }[]>;

    updated(changedProps: Map<keyof AvctSimilarClipsDialog, any>) {
        if (changedProps.has('params')) {
            this.apiResponse = send('clip/similar', { id: this.params });
        }
    }

    render(): ReturnType<LitElement['render']> {
        if (!this.apiResponse) { return 'Loading not started...'; }
        const clipId = this.params;
        return html`
            ${until(this.apiResponse.then(async similarClips => {
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
                                <td>${clipObj.getFile()}<${AvctCtxMenu} title="Play ${clipObj.getFile()}"><${AvctClipPlay} .clipId="${clipObj.id}" .path="${clipObj.path}" insideSpecial></${AvctClipPlay}></${AvctCtxMenu}></td>
                                <td>${clipObj.hasThumb ? until(clipObj.getThumb().then(str => html`<img src="${str}" />`), html`<span loading></span>`) : '(none)'}</td>
                                <td>${clipObj.note}</td>
                                <td>
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

export class AvctThumbnailDialog extends DialogBase<{ id: number, thumb: Promise<string> | null }, Blob> {
    static styles = css`
        :host { display: block; text-align: center; }
        hr { border: 0; border-bottom: 1px solid #e0e0e0; }
        .canvas-wrap { width: 360px; height: 240px; margin: 0 auto; overflow: hidden; }
        canvas { transform-origin: 0 0; }
    `;

    private static noThumbnail: HTMLImageElement = ((img: HTMLImageElement) => { img.src = 'no-thumbnail.jpg'; return img; })(new Image());

    @query('canvas')
    canvas!: HTMLCanvasElement;

    get canvasCtx(): CanvasRenderingContext2D { return this.canvas.getContext('2d')!; }

    updated() {
        if (this.params.thumb) {
            this.params.thumb.then(url => {
                loadImgUrlToCover(url, this.canvasCtx);
            });
        } else {        
            loadImgToCover(AvctThumbnailDialog.noThumbnail, this.canvasCtx);
        }
    }

    private async onLaunchShoot(): Promise<void> {
        const blob: Blob = await send('clip/shot', {'id': this.params.id });
        const url = URL.createObjectURL(blob);
        try {
            await loadImgUrlToCover(url, this.canvasCtx);
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    private onAcceptShoot(): void {
        this.canvas.toBlob(blob => this.done(blob!));
    }

    private onFileSelected(e: Event): void {
        const fileInput = e.currentTarget as HTMLInputElement;
        const fr = new FileReader();
        fr.onload = fe => {
            const url = fe.target!.result;
            loadImgUrlToCover(url as string, this.canvasCtx)
        };
        fr.readAsDataURL(fileInput.files![0]);
    }

    render(): ReturnType<LitElement['render']> {
        return html`
            <link rel="stylesheet" href="./shared.css" />
            <div class="canvas-wrap"><canvas width="1" height="1"></canvas></div>
            <hr />
            <input type="file" @change="${this.onFileSelected}" /><br />
            Or<br />
            <button @click="${this.onLaunchShoot}">Launch screenshooter</button>
            <hr />
            <button @click="${this.onAcceptShoot}">Accept</button>
        `;
    }
}