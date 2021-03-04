import { LitElement, css } from 'lit-element/lit-element.js';
import { html } from 'lit-html/static.js';
import { customElement } from 'lit-element/decorators/custom-element.js';
import { property } from 'lit-element/decorators/property.js';
import { repeat } from 'lit-html/directives/repeat.js';
import { guard } from 'lit-html/directives/guard.js';
import { AvctTableElementKey, StaticTagName } from './registry';
import { arrayNonEq, RowData } from './model';

interface Column {
    title: string;
    cellType: StaticTagName;
    width: number;
}

export const column = (title: string, cellType: StaticTagName): Column => ({ title, cellType, width: 100 });

@customElement(AvctTableElementKey)
export class AvctTableElement<T extends RowData> extends LitElement {
    static styles = css`
        table {
            border-collapse: collapse;
            width: 100%;
        }
        td {
            border-bottom: 1px solid #e0e0e0;
            padding: 2px;
        }
    `;

    @property({ attribute: false, hasChanged: arrayNonEq() })
    rows: T[] = [];

    @property({ attribute: false, hasChanged: arrayNonEq<Column>((col1, col2) => col1.cellType !== col2.cellType) })
    columns: Column[] = [];

    render() {
        return html`
            <table>
                <thead>
                    <tr>
                        ${this.columns.map(column => html`<th width="${column.width}">${column.title}</th>`)}
                    </tr>
                </thead>
                <tbody>
                    ${repeat(this.rows, row => row.id, 
                        row => guard([row.id, row.version], () => 
                            html`<tr>${this.columns.map(column => 
                                html`<td>
                                    <${column.cellType} .item="${row}" .version="${row.version}"></${column.cellType}>
                                </td>`
                            )}</tr>`
                        )
                    )}
                </tbody>
            </table>
        `;
    }
}