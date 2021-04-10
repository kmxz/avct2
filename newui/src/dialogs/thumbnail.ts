import { css, LitElement } from 'lit-element/lit-element.js';
import { html } from '../components/registry';
import { sendTypedApi } from '../api';
import { PopupBase } from '../components/dialog';
import { loadImgToCover, loadImgUrlToCover } from '../components/canvas-util';
import { query } from '@lit/reactive-element/decorators/query.js';
import { property } from '@lit/reactive-element/decorators/property.js';

export class AvctThumbnailDialog extends PopupBase<{ id: number; thumb: Promise<string> | null }, Blob> {
    static styles = css`
        :host { display: block; text-align: center; }
        hr { border: 0; border-bottom: 1px solid #e0e0e0; }
        .canvas-wrap { width: 360px; height: 240px; margin: 0 auto; overflow: hidden; }
        canvas { transform-origin: 0 0; }
    `;

    private static noThumbnail: HTMLImageElement = ((img: HTMLImageElement) => { img.src = 'no-thumbnail.jpg'; return img; })(new Image());

    @query('canvas')
    canvas!: HTMLCanvasElement;

    @property({ attribute: false })
    private locked = false;

    @property({ attribute: false })
    private thumbSet = false;

    get canvasCtx(): CanvasRenderingContext2D { return this.canvas.getContext('2d')!; }

    updated(changedProps: Map<keyof AvctThumbnailDialog, any>): ReturnType<LitElement['updated']> {
        if (!changedProps.has('params')) {
            return;
        }
        if (this.params.thumb) {
            this.params.thumb.then(url => {
                loadImgUrlToCover(url, this.canvasCtx);
            });
        } else {        
            loadImgToCover(AvctThumbnailDialog.noThumbnail, this.canvasCtx);
        }
    }

    private async onLaunchShoot(): Promise<void> {
        if (this.locked) { return; }
        this.locked = true;
        try {
            await this.onLaunchShootImpl();
        } finally {
            this.locked = false;
        }
    }

    private async onLaunchShootImpl(): Promise<void> {
        const blob: Blob = await sendTypedApi('!clip/$/shot', {'id': this.params.id });
        const url = URL.createObjectURL(blob);
        try {
            await loadImgUrlToCover(url, this.canvasCtx);
            this.thumbSet = true;
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    private onAcceptShoot(): void {
        if (!this.thumbSet) { return; }
        this.canvas.toBlob(blob => this.done(blob!));
    }

    private onFileSelected(e: Event): void {
        const fileInput = e.currentTarget as HTMLInputElement;
        const fr = new FileReader();
        fr.onload = fe => {
            const url = fe.target!.result;
            loadImgUrlToCover(url as string, this.canvasCtx);
            this.thumbSet = true;
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
            <button @click="${this.onLaunchShoot}" ?disabled="${this.locked}">Launch screenshooter</button>
            <hr />
            <button @click="${this.onAcceptShoot}" ?disabled="${!this.thumbSet}">Accept</button>
        `;
    }
}