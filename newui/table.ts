import { LitElement, css } from 'lit-element/lit-element.js';
import { html } from 'lit-html/static.js';
import { customElement } from 'lit-element/decorators/custom-element.js';
import { property } from 'lit-element/decorators/property.js';
import { repeat } from 'lit-html/directives/repeat.js';
import { guard } from 'lit-html/directives/guard.js';
import { AvctCtxMenu, AvctTableColumnEdit, AvctTableColumnEditElementKey, AvctTableElementKey, StaticTagName } from './registry';
import { arrayNonEq, recordNonEq, RowData } from './model';
import { query } from 'lit-element/decorators/query.js';

const INSERT_AT_END = 'INSERT_AT_END';

const uniqId = (() => {
    let nextId = 0;
    return () => `${++nextId}`;
})();

interface Column {
    id: string;
    title: string;
    cellType: StaticTagName;
    width: number;
}

export const column = (title: string, cellType: StaticTagName, show: boolean = true): Column => ({ id: uniqId(), title, cellType, width: show ? 100 : 0 });

@customElement(AvctTableColumnEditElementKey)
export class AvctTableColumnEditElement extends LitElement {
    static styles = css`
        :host {
            display: flex;
            position: relative;
            font-weight: normal;
        }
        ul {
            margin: 0;
            padding: 0;
            width: 96px;
        }
        li { display: block; position: relative; margin: 6px; background: rgba(255, 255, 255, 0.75); padding: 2px 4px; cursor: move; box-sizing: border-box; border: 1px solid transparent; }
        li.shadow { border: 1px dashed #c5c5cc; opacity: 0.5; }
        li:first-child { margin-top: 0; }
        li:last-child { margin-bottom: 0; }
        ul:first-child {
            padding-right: 8px;
            border-right: 1px solid #c5c5cc;
        }
        ul:last-child {
            padding-left: 8px;
        }
        .inactive li { opacity: 0.75; }
        li.active {
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
            position: absolute;
            z-index: 1;
            margin: 0;
        }
    `;

    @property({ attribute: false, hasChanged: arrayNonEq<Column>(recordNonEq<any>()) })
    columns: Column[] = [];

    @query('ul.active')
    activeUl!: HTMLUListElement;

    private handleMouseDown(e: MouseEvent): void {
        const oli = (e.currentTarget as HTMLElement);
        const oldCid = oli.dataset['columnId']!;
        // let insertBeforeCid: string = oldCid;
        const li = oli.cloneNode(true) as HTMLElement;
        li.classList.add('active');
        const singleWidth = oli.clientWidth;
        const singleHeight = oli.clientHeight;
        li.style.width = singleWidth + 'px';
        const initialX = e.clientX;
        const initialY = e.clientY;
        const initialElX = oli.offsetLeft;
        const initialElY = oli.offsetTop;
        oli.classList.add('shadow');
        const mouseMove = (e: MouseEvent): void => {
            const container = this.getBoundingClientRect();
            const leftUl = this.activeUl.getBoundingClientRect();
            const x = Math.min(Math.max(e.clientX, container.left), container.right);
            const y = Math.min(Math.max(e.clientY, container.top), container.bottom);
            const liX = x - initialX + initialElX;
            const liY = y - initialY + initialElY;
            li.style.left = liX + 'px';
            li.style.top = liY + 'px';
            const xCenter = liX + singleWidth / 2;
            const yCenter = liY + singleHeight / 2;
            requestAnimationFrame(() => {
                const toBeActive = xCenter < leftUl.right - container.left;
                const parentNode = toBeActive ? this.activeUl : (this.activeUl.nextElementSibling as HTMLUListElement);
                const existingChildren = Array.from(parentNode.children) as HTMLElement[];
                let insertBefore: string | undefined;
                for (let i = 0; i < existingChildren.length; i++) {
                    const refTop = existingChildren[i].offsetTop;
                    const refHeight = existingChildren[i].offsetHeight;
                    if (yCenter < refTop + refHeight * 0.25) {
                        if ((existingChildren[i] !== oli) && ((i === 0) || (existingChildren[i - 1] !== oli))) {
                            insertBefore = existingChildren[i].dataset['columnId']!;
                        } else {
                            insertBefore = oldCid; // Position not changed.
                        }
                        break;
                    }
                    if (yCenter < refTop + refHeight * 0.75) {
                        insertBefore = oldCid; break;
                    }
                }
                if (!insertBefore) {
                    if ((existingChildren.length === 0) || (existingChildren[existingChildren.length - 1] !== oli)) {
                        insertBefore = INSERT_AT_END;
                    } else {
                        insertBefore = oldCid;
                    }
                }
                if (insertBefore !== oldCid) {
                    const columnsCopy = Array.from(this.columns);
                    let columnToMove = columnsCopy.splice(columnsCopy.findIndex(column => column.id === oldCid), 1)[0];
                    if (toBeActive && !columnToMove.width) {
                        columnToMove = { ...columnToMove, width: 100 };
                    } else if (!toBeActive && columnToMove.width) {
                        columnToMove = { ...columnToMove, width: 0 };
                    }
                    columnsCopy.splice((insertBefore === INSERT_AT_END) ? Number.MAX_SAFE_INTEGER : columnsCopy.findIndex(column => column.id === insertBefore), 0, columnToMove);
                    this.columns = columnsCopy;
                }
            });
        };
        li.style.left = initialElX + 'px';
        li.style.top = initialElY + 'px';
        li.addEventListener('mousemove', mouseMove);
        const end = (): void => {
            li.removeEventListener('mousemove', mouseMove);
            li.removeEventListener('mouseup', end);
            li.removeEventListener('mouseout', end);
            li.parentNode!.removeChild(li);
            oli.classList.remove('shadow');
            e.preventDefault();
            this.dispatchEvent(new CustomEvent<Column[]>('avct-select', { detail: this.columns }));
        };
        li.addEventListener('mouseup', end);
        li.addEventListener('mouseout', end);
        (this.shadowRoot ?? this).appendChild(li);
        e.preventDefault();
    }

    private renderGroup(columns: Column[]): ReturnType<LitElement['render']> {
        return repeat(columns, entry => entry.id, entry => html`<li data-column-id="${String(entry.id)}" @mousedown="${this.handleMouseDown}">${entry.title}</li>`);
    }

    render() {
        return html`
            <ul class="active">
                ${this.renderGroup(this.columns.filter(column => column.width))}
            </ul>
            <ul class="inactive">
                ${this.renderGroup(this.columns.filter(column => !column.width))}
            </ul>
        `;
    }
}

@customElement(AvctTableElementKey)
export class AvctTableElement<T extends RowData> extends LitElement {
    @property({ attribute: false, hasChanged: arrayNonEq()})
    rows: T[] = [];

    @property({ attribute: false, hasChanged: arrayNonEq<Column>(recordNonEq<any>()) })
    columns: Column[] = [];

    private handleResizeMouseDown(e: MouseEvent) {
        const resizeHandle = e.currentTarget as HTMLElement;
        const index = parseInt((resizeHandle.parentNode as HTMLTableHeaderCellElement).dataset['index']!);
        const initialWidth = this.columns[index].width;
        const initialX = e.clientX;
        const mouseMove = (e: MouseEvent): void => {
            const diffX = e.clientX - initialX;
            const columnsCopy = Array.from(this.columns);
            columnsCopy[index] = { ...columnsCopy[index], width: Math.max(initialWidth + diffX, 40) };
            this.columns = columnsCopy;
            e.preventDefault();
        };
        resizeHandle.classList.add('active');
        const modal = document.createElement('div');
        modal.className = 'handle-drag-modal resize';
        modal.addEventListener('mousemove', mouseMove);
        const end = (): void => {
            modal.removeEventListener('mousemove', mouseMove);
            modal.removeEventListener('mouseup', end);
            resizeHandle.classList.remove('active');
            document.body.removeChild(modal);
            e.preventDefault();
        };
        modal.addEventListener('mouseup', end);
        document.body.appendChild(modal);
        e.preventDefault();
    }

    @property({ attribute: false })
    edit = false;

    private columnsChanged(event: CustomEvent<Column[]>): void { this.columns = event.detail; }
    private editColumns(): void { this.edit = true; }
    private abortEdit(): void { this.edit = false; }

    render() {
        const visibleColumns = this.columns.filter(column => column.width);
        const config = html`
            <button class="table-settings edit-button" @click="${this.editColumns}">⚙</button>
            ${this.edit ? html`
                <${AvctCtxMenu} shown shadow title="Change columns" @avct-close="${this.abortEdit}">
                    <${AvctTableColumnEdit} .columns="${this.columns}" @avct-select="${this.columnsChanged}"></${AvctTableColumnEdit}>
                </${AvctCtxMenu}>` 
            : null}
        `;
        return html`
            <table>
                <thead>
                    <tr>
                        ${visibleColumns.map((column, index, list) => html`<th width="${column.width}" data-index="${index}">${column.title}${(index === list.length - 1) ? config : null}<span @mousedown="${this.handleResizeMouseDown}"></span></th>`)}
                    </tr>
                </thead>
                <tbody>
                    ${repeat(this.rows, row => row.id, 
                        row => guard([row, this.columns], () => 
                            html`<tr>${visibleColumns.map(column => 
                                html`<td>
                                    <${column.cellType} .item="${row}"></${column.cellType}>
                                </td>`
                            )}</tr>`
                        )
                    )}
                </tbody>
            </table>
        `;
    }

    createRenderRoot() { return this; }
}