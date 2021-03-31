import { LitElement, css } from 'lit-element/lit-element.js';
import { property } from 'lit-element/decorators/property.js';
import { html } from '../components/registry';
import { Clip, clips, tags } from '../data';
import { DialogBase } from '../components/dialog';
import { asyncReplace } from 'lit-html/directives/async-replace.js';
import { ClipId, TagJson } from '../model';
import { AvctTable, column } from '../components/table';
import { AvctCtxMenu } from '../components/menu';
import { AvctClipPlay } from '../menus/clip-play';
import { AvctTagList } from '../tags';
import { MAX_GOOD_INTEGER } from '../components/utils';

abstract class TagCellElementBase extends LitElement {
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

class AvctTagName extends TagCellElementBase {
    renderContent(): ReturnType<LitElement['render']> {
        return this.row.name; // TODO: edit
    }
}

class AvctTagType extends TagCellElementBase {
    renderContent(): ReturnType<LitElement['render']> {
        return html`<span class="tag-chip tag-type-${this.row.type.toLowerCase()}">${this.row.type}</span>`;
    }
}

class AvctTagDescription extends TagCellElementBase {
    renderContent(): ReturnType<LitElement['render']> {
        return this.row.description; // TODO: edit
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
        return asyncReplace(clips.value(), clipsMap => {
            // TODO(kmxz)
        });
    }
}

class AvctTagParent extends TagCellElementBase {
    private removeTag(e: CustomEvent<number>): Promise<void> {
        const newTags = this.row.parent.filter(id => id !== e.detail);
        // TODO
    }

    private selectTag(e: CustomEvent<number>): Promise<void> {
        e.stopPropagation();
        const newTags = this.row.parent.concat(e.detail);
        // TODO
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
                .rows="${Array.from(this.tags.values())}"
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
