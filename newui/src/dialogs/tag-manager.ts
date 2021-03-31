import { LitElement, css } from 'lit-element/lit-element.js';
import { property } from 'lit-element/decorators/property.js';
import { html } from '../components/registry';
import { Clip, clips, tags } from '../data';
import { DialogBase } from '../components/dialog';
import { asyncReplace } from 'lit-html/directives/async-replace.js';
import { ClipId, MultiStore, TagJson } from '../model';
import { AvctTable, column } from '../components/table';
import { AvctCtxMenu } from '../components/menu';
import { AvctClipPlay } from '../menus/clip-play';
import { AvctTagList } from '../tags';
import { MAX_GOOD_INTEGER, simpleStat } from '../components/utils';
import { sendTypedApi } from '../api';
import { globalToast } from '../components/toast';
import { AvctTextEdit } from '../menus/text-edit';

abstract class TagCellElementBase extends LitElement {
    @property({ type: Boolean, reflect: true })
    loading = false;

    @property({ attribute: false })
    row!: TagJson;

    td(): HTMLTableDataCellElement {
        const td = this.parentNode as HTMLElement;
        if (td.nodeName.toUpperCase() !== 'TD') { throw new TypeError('Not used as a cell.'); }
        return td as HTMLTableDataCellElement;
    }

    render(): ReturnType<LitElement['render']> {
        return html`
            <link rel="stylesheet" href="./shared.css" />
            ${this.renderContent()}
        `;
    }

    abstract renderContent(): ReturnType<LitElement['render']>;
}

abstract class AvctTagNameOrDescription extends TagCellElementBase {
    @property({ attribute: false })
    edit = false;

    protected abstract fieldName: 'name' | 'description';

    private dirty = false;

    private markDirty(): void { this.dirty = true; }
    private startEdit(): void { this.edit = true; this.dirty = false; }
    private abortEdit(): void { 
        if (!this.edit) { return; }
        if (this.dirty) { globalToast(`Tag ${this.fieldName} editor discarded.`); }
        this.edit = false;
    }
    private async done(e: CustomEvent<string>): Promise<void> { 
        this.edit = false; 
        try {
            this.loading = true;
            await this.executeActualUpdate(e.detail);
        } finally {
            this.loading = false;
        }
    }
    
    protected abstract executeActualUpdate(newValue: string): Promise<void>;

    renderContent(): ReturnType<LitElement['render']> {
        return html`
            ${this.row[this.fieldName]}
            <button part="td-hover" class="round-button" @click="${this.startEdit}">✎</button>
            ${this.edit ? html`
                <${AvctCtxMenu} shown shadow title="Edit ${this.fieldName}" @avct-close="${this.abortEdit}">
                    <${AvctTextEdit} value="${this.row[this.fieldName]}" @avct-touch="${this.markDirty}" @avct-select="${this.done}"></${AvctTextEdit}>
                </${AvctCtxMenu}>`
            : null}
        `;
    }
}

class AvctTagName extends AvctTagNameOrDescription {
    protected fieldName = 'name' as const;

    protected async executeActualUpdate(newValue: string): Promise<void> {
        await sendTypedApi('!tag/$/edit', { id: this.row.id, name: newValue });
        tags.update(MultiStore.mapUpdater(this.row.id, { ...this.row, name: newValue }));
    }
}

class AvctTagType extends TagCellElementBase {
    @property({ attribute: false })
    edit = false;

    renderContent(): ReturnType<LitElement['render']> {
        return html`<span class="tag-chip tag-type-${this.row.type.toLowerCase()}">${this.row.type}</span>`;
    }
}

class AvctTagDescription extends AvctTagNameOrDescription {
    protected fieldName = 'description' as const;

    protected async executeActualUpdate(newValue: string): Promise<void> {
        await sendTypedApi('!tag/$/description', { id: this.row.id, description: newValue });
        tags.update(MultiStore.mapUpdater(this.row.id, { ...this.row, description: newValue }));
    }
}

class AvctTagBest extends TagCellElementBase {
    renderContent(): ReturnType<LitElement['render']> {
        return this.row.best ? asyncReplace(clips.value(), clipsMap => {
            const clipObj = (clipsMap as Map<ClipId, Clip>).get(this.row.best);
            if (!clipObj) { return `(error: clip ${this.row.best} not found)`; }
            return html`${clipObj.getFile()}<${AvctCtxMenu} title="Play ${clipObj.getFile()}"><${AvctClipPlay} .clipId="${clipObj.id}" .path="${clipObj.path}" insideSpecial></${AvctClipPlay}></${AvctCtxMenu}>`;
        }) : '(not set)';
    }
}

class AvctTagStat extends TagCellElementBase {
    renderContent(): ReturnType<LitElement['render']> {
        const tagId = this.row.id;
        return asyncReplace(clips.value(), clipsMap => {
            const relevantClips = Array.from((clipsMap as Map<number, Clip>).values()).filter(clip => clip.tags.includes(tagId));
            if (!relevantClips.length) { return 'not used in any clips'; }
            const scores = relevantClips.map(item => item.score).filter(score => score);
            const scoreText = scores.length ? (
                ((scores.length === relevantClips.length) ? '' : `(${(scores.length)} rated) `) + simpleStat(scores)
            ) : 'none has a rating';
            return html`used in ${relevantClips.length} clips; ${scoreText}`;
        });
    }
}

class AvctTagParent extends TagCellElementBase {
    private removeTag(e: CustomEvent<number>): Promise<void> {
        return this.setParentTags(this.row.parent.filter(id => id !== e.detail));
    }

    private selectTag(e: CustomEvent<number>): Promise<void> {
        return this.setParentTags(this.row.parent.concat(e.detail));
    }

    private async setParentTags(parent: number[]): Promise<void> {
        try {
            this.loading = true;
            await sendTypedApi('!tag/$/parent', { id: this.row.id, parent });
            tags.update(MultiStore.mapUpdater(this.row.id, { ...this.row, parent }));
        } finally {
            this.loading = false;
        }
    }

    renderContent(): ReturnType<LitElement['render']> {
        return html`<${AvctTagList} .tags="${asyncReplace(tags.value(), tagsMap => this.row.parent.map(id => (tagsMap as Map<number, TagJson>).get(id)))}" @avct-select="${this.selectTag}" @avct-remove="${this.removeTag}" allowCreation></${AvctTagList}>`;
    }
}

class AvctTagChildren extends TagCellElementBase {
    static styles = css`
        a { color: inherit; text-decoration: none; }
    `;

    private goToTag(e: Event): void {
        const id = (e.target as HTMLElement).dataset['tagId']!;
        const sibling = AvctTable.getSibling(e.target as HTMLElement, id);
        sibling!.scrollIntoView();
    } 

    renderContent(): ReturnType<LitElement['render']> {
        const tagId = this.row.id;
        return asyncReplace(tags.value(), tagsMap => {
            const children = Array.from((tagsMap as Map<number, TagJson>).values()).filter(tag => tag.parent.includes(tagId));
            return children.map(child => html`<a href="javascript:void(0)" data-tag-id="${child.id}" @click="${this.goToTag}" class="tag-chip ${'tag-type-' + child.type.toLowerCase()}">${child.name}</a>`);
        });
    }
}

export class AvctClipHistoryDialogInner extends LitElement {
    static styles = css`
        :host { display: flex; flex-direction: column; overflow: hidden; padding: 0; }
    `;

    @property({ attribute: false })
    tags?: Map<number, TagJson>;

    private static readonly columns = [
        column('Name', AvctTagName),
        column('Type', AvctTagType),
        column('Description', AvctTagDescription),
        column('Best', AvctTagBest),
        column('Stat', AvctTagStat),
        column('Parent', AvctTagParent),
        column('Child', AvctTagChildren),
    ];

    render(): ReturnType<LitElement['render']> {
        if (!this.tags) {
            return html`Loading...`;
        }
        return html`
            <${AvctTable}
                .rows="${Array.from(this.tags.values()).sort((a, b) => a.name.localeCompare(b.name))}"
                .columns="${AvctClipHistoryDialogInner.columns}"
                .visibleRows="${MAX_GOOD_INTEGER}">
            </${AvctTable}>`;
    }
}

export class AvctTagManagerDialog extends DialogBase<void, void> {
    static styles = css`
        :host { display: flex; flex-direction: column; overflow: hidden; padding: 0 !important; }
    `;

    render(): ReturnType<LitElement['render']> {
        return html`<${AvctClipHistoryDialogInner} .tags="${asyncReplace(tags.value())}"></${AvctClipHistoryDialogInner}>`;
    }
}
