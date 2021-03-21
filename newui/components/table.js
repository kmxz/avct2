var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, css } from 'lit-element/lit-element.js';
import { property } from 'lit-element/decorators/property.js';
import { repeat } from 'lit-html/directives/repeat.js';
import { guard } from 'lit-html/directives/guard.js';
import { html } from './registry';
import { arrayNonEq, recordNonEq } from '../model';
import { query } from 'lit-element/decorators/query.js';
import { seq } from './utils';
import { AvctCtxMenu } from './menu';
const INSERT_AT_END = 'INSERT_AT_END';
const uniqId = seq();
export const column = (title, cellType, show = true) => ({ id: `${uniqId()}`, title, cellType, width: show ? 100 : 0 });
export class AvctTableColumnEdit extends LitElement {
    constructor() {
        super(...arguments);
        this.columns = [];
    }
    handleMouseDown(e) {
        const oli = e.currentTarget;
        const oldCid = oli.dataset['columnId'];
        // let insertBeforeCid: string = oldCid;
        const li = oli.cloneNode(true);
        li.classList.add('active');
        const singleWidth = oli.clientWidth;
        const singleHeight = oli.clientHeight;
        li.style.width = singleWidth + 'px';
        const initialX = e.clientX;
        const initialY = e.clientY;
        const initialElX = oli.offsetLeft;
        const initialElY = oli.offsetTop;
        oli.classList.add('shadow');
        const mouseMove = (e) => {
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
                const parentNode = toBeActive ? this.activeUl : this.activeUl.nextElementSibling;
                const existingChildren = Array.from(parentNode.children);
                let insertBefore;
                for (let i = 0; i < existingChildren.length; i++) {
                    const refTop = existingChildren[i].offsetTop;
                    const refHeight = existingChildren[i].offsetHeight;
                    if (yCenter < refTop + refHeight * 0.25) {
                        if ((existingChildren[i] !== oli) && ((i === 0) || (existingChildren[i - 1] !== oli))) {
                            insertBefore = existingChildren[i].dataset['columnId'];
                        }
                        else {
                            insertBefore = oldCid; // Position not changed.
                        }
                        break;
                    }
                    if (yCenter < refTop + refHeight * 0.75) {
                        insertBefore = oldCid;
                        break;
                    }
                }
                if (!insertBefore) {
                    if ((existingChildren.length === 0) || (existingChildren[existingChildren.length - 1] !== oli)) {
                        insertBefore = INSERT_AT_END;
                    }
                    else {
                        insertBefore = oldCid;
                    }
                }
                if (insertBefore !== oldCid) {
                    const columnsCopy = Array.from(this.columns);
                    let columnToMove = columnsCopy.splice(columnsCopy.findIndex(column => column.id === oldCid), 1)[0];
                    if (toBeActive && !columnToMove.width) {
                        columnToMove = { ...columnToMove, width: 100 };
                    }
                    else if (!toBeActive && columnToMove.width) {
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
        const end = () => {
            li.removeEventListener('mousemove', mouseMove);
            li.removeEventListener('mouseup', end);
            li.removeEventListener('mouseout', end);
            li.parentNode.removeChild(li);
            oli.classList.remove('shadow');
            e.preventDefault();
            this.dispatchEvent(new CustomEvent('avct-select', { detail: this.columns }));
        };
        li.addEventListener('mouseup', end);
        li.addEventListener('mouseout', end);
        (this.shadowRoot ?? this).appendChild(li);
        e.preventDefault();
    }
    renderGroup(columns) {
        return repeat(columns, entry => entry.id, entry => html `<li data-column-id="${String(entry.id)}" @mousedown="${this.handleMouseDown}">${entry.title}</li>`);
    }
    render() {
        return html `
            <ul class="active">
                ${this.renderGroup(this.columns.filter(column => column.width))}
            </ul>
            <ul class="inactive">
                ${this.renderGroup(this.columns.filter(column => !column.width))}
            </ul>
        `;
    }
}
AvctTableColumnEdit.styles = css `
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
__decorate([
    property({ attribute: false, hasChanged: arrayNonEq(recordNonEq()) })
], AvctTableColumnEdit.prototype, "columns", void 0);
__decorate([
    query('ul.active')
], AvctTableColumnEdit.prototype, "activeUl", void 0);
export class AvctTable extends LitElement {
    constructor() {
        super();
        this.rows = [];
        this.columns = [];
        this.editingColumns = false;
        this.visibleRows = 20;
        this.scrollTopToRecover = -1;
        this.scrollListener = () => {
            if (this.visibleRows >= this.rows.length) {
                return;
            }
            const scrollHost = this.getBoundingClientRect();
            const loadMoreElement = this.loadMoreTd.getBoundingClientRect();
            if (loadMoreElement.top + loadMoreElement.bottom < scrollHost.bottom * 2) {
                this.scrollTopToRecover = this.scrollTop;
                this.visibleRows += 10;
            }
        };
        this.restoreScrollPosition = () => {
            if (this.scrollTopToRecover < 0) {
                return;
            }
            if (this.scrollHeight < this.scrollTopToRecover) {
                requestAnimationFrame(this.restoreScrollPosition);
            }
            else {
                this.scrollTop = this.scrollTopToRecover;
                this.scrollTopToRecover = -1;
            }
        };
        this.addEventListener('scroll', this.scrollListener);
    }
    handleResizeMouseDown(e) {
        const resizeHandle = e.currentTarget;
        const index = parseInt(resizeHandle.parentNode.dataset['index']);
        const initialWidth = this.columns[index].width;
        const initialX = e.clientX;
        const mouseMove = (e) => {
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
        const end = () => {
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
    columnsChanged(event) { this.columns = event.detail; }
    editColumns() { this.editingColumns = true; }
    abortEdit() { this.editingColumns = false; }
    updated() {
        if (this.scrollTopToRecover >= 0) {
            requestAnimationFrame(this.restoreScrollPosition);
        }
    }
    render() {
        const visibleColumns = this.columns.filter(column => column.width);
        const visibleRows = this.rows.slice(0, this.visibleRows);
        const config = html `
            <button class="table-settings round-button" @click="${this.editColumns}">⚙</button>
            ${this.editingColumns ? html `
                <${AvctCtxMenu} shown shadow title="Change columns" @avct-close="${this.abortEdit}">
                    <${AvctTableColumnEdit} .columns="${this.columns}" @avct-select="${this.columnsChanged}"></${AvctTableColumnEdit}>
                </${AvctCtxMenu}>`
            : null}
        `;
        return html `
            <table>
                <thead>
                    <tr>
                        ${visibleColumns.map((column, index, list) => html `<th width="${column.width}" data-index="${index}">${column.title}${(index === list.length - 1) ? config : null}<span @mousedown="${this.handleResizeMouseDown}"></span></th>`)}
                    </tr>
                </thead>
                <tbody>
                    ${repeat(visibleRows, row => row.id, row => guard([row, this.columns], () => html `<tr>${visibleColumns.map(column => html `<td>
                                    <${column.cellType} .item="${row}"></${column.cellType}>
                                </td>`)}</tr>`))}
                </tbody>
                <tfoot>
                    <tr><td class="load-more" colspan="${visibleColumns.length}">${(visibleRows.length >= this.rows.length ? html `All ${visibleRows.length} rows have been rendered` : html `Load more...`)}</td></tr>
                </tfoot>
            </table>
        `;
    }
    createRenderRoot() { return this; }
}
__decorate([
    property({ attribute: false, hasChanged: arrayNonEq() })
], AvctTable.prototype, "rows", void 0);
__decorate([
    property({ attribute: false, hasChanged: arrayNonEq(recordNonEq()) })
], AvctTable.prototype, "columns", void 0);
__decorate([
    property({ attribute: false })
], AvctTable.prototype, "editingColumns", void 0);
__decorate([
    property({ attribute: false })
], AvctTable.prototype, "visibleRows", void 0);
__decorate([
    query('.load-more')
], AvctTable.prototype, "loadMoreTd", void 0);
