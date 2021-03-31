import { LitElement, css } from 'lit-element/lit-element.js';
import { property } from 'lit-element/decorators/property.js';
import { repeat } from 'lit-html/directives/repeat.js';
import { guard } from 'lit-html/directives/guard.js';
import { ElementType, html } from './registry';
import { arrayNonEq, recordNonEq, RowData } from '../model';
import { query } from 'lit-element/decorators/query.js';
import { MAX_GOOD_INTEGER, seq } from './utils';
import { AvctCtxMenu } from './menu';
import { styleMap } from 'lit-html/directives/style-map.js';
import { classMap } from 'lit-html/directives/class-map.js';

const INSERT_AT_END = 'INSERT_AT_END';

const uniqId = seq();

interface Column {
    readonly id: string;
    readonly title: string;
    readonly cellType: ElementType;
    readonly width: number;
}

export const column = (title: string, cellType: ElementType, show: boolean = true): Column => ({ id: `${uniqId()}`, title, cellType, width: show ? 100 : 0 });

interface Moving {
    readonly id: string;
    readonly title: string;
    readonly initialElX: number; readonly initialElY: number;
    readonly elWidth: number; readonly elHeight: number;
    currentX: number; currentY: number;
}

export class AvctTableColumnEdit extends LitElement {
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
        .moving {
            padding: 0; margin: 0; width: 0;
        }
        .moving li {
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

    @property({ attribute: false })
    moving?: Moving;

    private handleMouseDown(e: MouseEvent): void {
        const oli = (e.currentTarget as HTMLElement);
        const oldCid = oli.dataset['columnId']!;
        this.moving = {
            initialElX: oli.offsetLeft - e.clientX,
            initialElY: oli.offsetTop - e.clientY,
            currentX: oli.offsetLeft,
            currentY: oli.offsetTop,
            elWidth: oli.clientWidth,
            elHeight: oli.clientHeight,
            id: oldCid,
            title: oli.textContent!
        }
        e.preventDefault();
    }

    private handleMouseMove(e: MouseEvent): void {
        const li = e.currentTarget as HTMLLIElement;
        if (!this.moving) { return; }
        const { initialElX, initialElY, elWidth, elHeight, id: oldCid } = this.moving;
        const container = this.getBoundingClientRect();
        const leftUl = this.activeUl.getBoundingClientRect();
        const x = Math.min(Math.max(e.clientX, container.left), container.right);
        const y = Math.min(Math.max(e.clientY, container.top), container.bottom);
        const liX = x + initialElX;
        const liY = y + initialElY;
        li.style.left = liX + 'px';
        li.style.top = liY + 'px';
        // The two lines above won't trigger rerender as `this.moving` is still the same instance. It will however ensure the location once the template do gets rerendered due to other changes.
        this.moving.currentX = liX;
        this.moving.currentY = liY;
        const xCenter = liX + elWidth / 2;
        const yCenter = liY + elHeight / 2;
        requestAnimationFrame(() => {
            const toBeActive = xCenter < leftUl.right - container.left;
            const parentNode = toBeActive ? this.activeUl : (this.activeUl.nextElementSibling as HTMLUListElement);
            const existingChildren = Array.from(parentNode.children) as HTMLElement[];
            let insertBefore: string | undefined;
            for (let i = 0; i < existingChildren.length; i++) {
                const refTop = existingChildren[i].offsetTop;
                const refHeight = existingChildren[i].offsetHeight;
                if (yCenter < refTop + refHeight * 0.25) {
                    if ((existingChildren[i].dataset['columnId'] !== oldCid) && ((i === 0) || (existingChildren[i - 1].dataset['columnId'] !== oldCid))) {
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
                if ((existingChildren.length === 0) || (existingChildren[existingChildren.length - 1].dataset['columnId'] !== oldCid)) {
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
                columnsCopy.splice((insertBefore === INSERT_AT_END) ? MAX_GOOD_INTEGER : columnsCopy.findIndex(column => column.id === insertBefore), 0, columnToMove);
                this.columns = columnsCopy;
            }
        });
    }

    private handleMouseEnd(e: MouseEvent): void {
        e.preventDefault();
        requestAnimationFrame(() => {
            this.moving = void 0;
            this.dispatchEvent(new CustomEvent<Column[]>('avct-select', { detail: this.columns }));
        });
    }

    private renderGroup(columns: Column[]): ReturnType<LitElement['render']> {
        const movingId = this.moving?.id;
        return repeat(columns, entry => entry.id, entry => html`<li data-column-id="${String(entry.id)}" class="${classMap({ 'shadow': entry.id === movingId })}" @mousedown="${this.handleMouseDown}">${entry.title}</li>`);
    }
    
    render(): ReturnType<LitElement['render']> {
        const moving = this.moving;
        return html`
            <ul class="active">
                ${this.renderGroup(this.columns.filter(column => column.width))}
            </ul>
            <ul class="inactive">
                ${this.renderGroup(this.columns.filter(column => !column.width))}
            </ul>
            <ul class="moving">${moving ? html`<li data-column-id="${String(moving.id)}" @mousemove="${this.handleMouseMove}" @mouseout="${this.handleMouseEnd}" @mouseup="${this.handleMouseEnd}" style="${styleMap({ left: moving.currentX + 'px', top: moving.currentY + 'px', width: moving.elWidth + 'px', height: moving.elHeight + 'px' })}">${moving.title}</li>` : null}</ul>
        `;
    }
}

export class AvctTable<T extends RowData> extends LitElement {
    static styles = css`
        :host {
            overflow: auto;
            height: 100%;
            display: block;
            position: relative;
        }

        table {
            border-collapse: collapse;
            width: 100%;
        }
        
        th {
            border-bottom: 1px solid #c5c5cc;
            position: sticky;
            z-index: 1;
            background: #FFF;
            top: 0;
            padding: 4px 2px;
            user-select: none;
        }
        
        th span { /* resize handle */
            position: absolute;
            visibility: hidden;
            right: 0;
            top: 0;
            bottom: 0;
            width: 4px;
            display: block;
            background: #e0e0e0;
            cursor: e-resize;
        }
        
        th:hover span {
            visibility: visible;
        }
        
        th:hover span:hover {
            background: #c5c5cc;
        }
        
        th span.active {
            visibility: visible;
            background: #7986CB;
        }
        
        tbody td {
            border-bottom: 1px solid #e0e0e0;
            padding: 2px;
            position: relative; 
        }

        ::part(td-hover) {
            opacity: 0.25;
        }

        td:hover ::part(td-hover) {
            opacity: 1;
        } 
        
        .table-settings {
            visibility: hidden;
            position: absolute;
            right: 2px;
            top: 2px;
        }
        
        tr:hover .table-settings {
            visibility: visible;
        }
        
        .handle-drag-modal {
            position: fixed;
            left: 0;
            top: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.025);
            z-index: 100;
        }
        
        .handle-drag-modal.resize { cursor: e-resize; }
        
        tfoot td {
            text-align: center;
            padding: 16px;
        }

        th:first-child, tbody td:first-child {
            padding-left: 8px;
        }

        th:last-child, tbody td:last-child {
            padding-right: 8px;
        }
    `;

    constructor() {
        super();
        this.addEventListener('scroll', this.scrollListener);
        this.tableId = `avct-table-${AvctTable.instancesSeq()}`;
    }

    private static instancesSeq = seq();

    private readonly tableId: string;

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
            this.renderRoot.removeChild(modal);
            e.preventDefault();
        };
        modal.addEventListener('mouseup', end);
        this.renderRoot.appendChild(modal);
        e.preventDefault();
    }

    @property({ attribute: false })
    editingColumns = false;

    @property({ attribute: false })
    visibleRows = 10;

    private columnsChanged(event: CustomEvent<Column[]>): void { this.columns = event.detail; }
    private editColumns(): void { this.editingColumns = true; }
    private abortEdit(): void { this.editingColumns = false; }

    private scrollTopToRecover = -1;

    private readonly scrollListener = (): void => {
        if (this.visibleRows >= this.rows.length) { return; }
        const scrollHost = this.getBoundingClientRect();
        const loadMoreElement = this.loadMoreTd!.getBoundingClientRect();
        if (loadMoreElement.top + loadMoreElement.bottom < scrollHost.bottom * 2) {
            this.scrollTopToRecover = this.scrollTop;
            this.loadMore();
        }
    };

    private loadMore(): void {
        this.visibleRows += 10;
    }

    private readonly restoreScrollPosition = (): void => {
        if (this.scrollTopToRecover < 0) { return; }
        if (this.scrollHeight < this.scrollTopToRecover) { 
            requestAnimationFrame(this.restoreScrollPosition);
        } else {
            this.scrollTop = this.scrollTopToRecover;
            this.scrollTopToRecover = -1;
        }
    }

    updated(): ReturnType<LitElement['updated']> {
        if (this.scrollTopToRecover >= 0) {
            requestAnimationFrame(this.restoreScrollPosition);
        }
    }

    @query('.load-more')
    loadMoreTd!: HTMLTableDataCellElement;

    static getSibling(anchor: HTMLElement, id: RowData['id']): HTMLElement | null {
        let current: Node | null = anchor;
        while (current) {
            if (current.nodeType === 11) {
                current = (current as ShadowRoot).host;
            }
            if (current instanceof AvctTable) {
                return current.renderRoot.querySelector(`#${current.tableId}-${id}`);
            }
            current = current.parentNode;
        }
        throw new RangeError('Host AvctTable not found');
    }

    render(): ReturnType<LitElement['render']> {
        const visibleColumns = this.columns.filter(column => column.width);
        const visibleRows = this.rows.slice(0, this.visibleRows);
        const config = html`
            <button class="table-settings round-button" @click="${this.editColumns}">⚙</button>
            ${this.editingColumns ? html`
                <${AvctCtxMenu} shown shadow title="Change columns" @avct-close="${this.abortEdit}">
                    <${AvctTableColumnEdit} .columns="${this.columns}" @avct-select="${this.columnsChanged}"></${AvctTableColumnEdit}>
                </${AvctCtxMenu}>` 
            : null}
        `;
        return html`    
            <link rel="stylesheet" href="./shared.css" />
            <table>
                <thead>
                    <tr>
                        ${visibleColumns.map((column, index, list) => html`<th width="${column.width}" data-index="${index}" class="${classMap({ 'ctx-menu-host': index === list.length - 1 })}">${column.title}${(index === list.length - 1) ? config : null}<span @mousedown="${this.handleResizeMouseDown}"></span></th>`)}
                    </tr>
                </thead>
                <tbody>
                    ${repeat(visibleRows, row => row.id, 
                        row => guard([row, this.columns], () => 
                            html`<tr id="${this.tableId}-${row.id}">${visibleColumns.map(column => 
                                html`<td>
                                    <${column.cellType} .row="${row}"></${column.cellType}>
                                </td>`
                            )}</tr>`
                        )
                    )}
                </tbody>
                <tfoot>
                    <tr><td class="load-more" colspan="${visibleColumns.length}" @click="${this.loadMore}">${(visibleRows.length >= this.rows.length ? html`All ${visibleRows.length} rows have been rendered` : html`Load more...`)}</td></tr>
                </tfoot>
            </table>
        `;
    }
}