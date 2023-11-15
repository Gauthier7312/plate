import {
  findNode,
  findNodePath,
  getPluginOptions,
  getPluginType,
  PlateEditor,
  TElement,
  TElementEntry,
  Value,
} from '@udecode/plate-common';
import { Range } from 'slate';

import { ELEMENT_TABLE } from '../createTablePlugin';
import { computeCellIndices } from '../merge/computeCellIndices';
import { findCellByIndexes } from '../merge/findCellByIndexes';
import { getIndices } from '../merge/getIndices';
import { getIndicesWithSpans } from '../merge/getIndicesWithSpans';
import {
  TablePlugin,
  TTableCellElement,
  TTableElement,
  TTableRowElement,
} from '../types';
import { getCellTypes } from '../utils';
import { getEmptyTableNode } from '../utils/getEmptyTableNode';

export type FormatType = 'table' | 'cell' | 'all';

export interface TableGridEntries {
  tableEntries: TElementEntry[];
  cellEntries: TElementEntry[];
}

export type GetTableGridReturnType<T> = T extends 'all'
  ? TableGridEntries
  : TElementEntry[];

export interface GetTableGridByRangeOptions {
  at: Range;

  /**
   * Format of the output:
   * - table element
   * - array of cells
   */
  format?: 'table' | 'cell';
}

/**
 * Get sub table between 2 cell paths.
 */
export const getTableGridByRange = <V extends Value>(
  editor: PlateEditor<V>,
  { at, format = 'table' }: GetTableGridByRangeOptions
): TElementEntry[] => {
  const options = getPluginOptions<TablePlugin, V>(editor, ELEMENT_TABLE);

  const startCellEntry = findNode(editor, {
    at: (at as any).anchor.path,
    match: { type: getCellTypes(editor) },
  })!; // TODO: improve typing
  const endCellEntry = findNode(editor, {
    at: (at as any).focus.path,
    match: { type: getCellTypes(editor) },
  })!;

  const startCell = startCellEntry[0] as TTableCellElement;
  const endCell = endCellEntry[0] as TTableCellElement;

  const startCellPath = (at as any).anchor.path;
  const tablePath = startCellPath.slice(0, -2);

  const tableEntry = findNode(editor, {
    at: tablePath,
    match: { type: getPluginType(editor, ELEMENT_TABLE) },
  })!; // TODO: improve typing
  const realTable = tableEntry[0] as TTableElement;

  const { col: _startColIndex, row: _startRowIndex } =
    getIndices(options, startCell) ||
    computeCellIndices(editor, realTable, startCell)!;

  const { row: _endRowIndex, col: _endColIndex } = getIndicesWithSpans(
    getIndices(options, endCell) ||
      computeCellIndices(editor, realTable, endCell)!,
    endCell
  );

  const startRowIndex = Math.min(_startRowIndex, _endRowIndex);
  const endRowIndex = Math.max(_startRowIndex, _endRowIndex);
  const startColIndex = Math.min(_startColIndex, _endColIndex);
  const endColIndex = Math.max(_startColIndex, _endColIndex);

  const relativeRowIndex = endRowIndex - startRowIndex;
  const relativeColIndex = endColIndex - startColIndex;

  const table: TTableElement = getEmptyTableNode(editor, {
    rowCount: relativeRowIndex + 1,
    colCount: relativeColIndex + 1,
    newCellChildren: [],
  });

  const cellEntries: TElementEntry[] = [];
  const cellsSet = new WeakSet();

  let rowIndex = startRowIndex;
  let colIndex = startColIndex;
  while (true) {
    const cell = findCellByIndexes(editor, realTable, rowIndex, colIndex);
    if (!cell) {
      break;
    }

    if (!cellsSet.has(cell)) {
      cellsSet.add(cell);

      const rows = table.children[rowIndex - startRowIndex]
        .children as TElement[];
      rows[colIndex - startColIndex] = cell;

      const cellPath = findNodePath(editor, cell)!;
      cellEntries.push([cell, cellPath]);
    }

    if (colIndex + 1 <= endColIndex) {
      colIndex = colIndex + 1;
    } else if (rowIndex + 1 <= endRowIndex) {
      colIndex = startColIndex;
      rowIndex = rowIndex + 1;
    } else {
      break;
    }
  }

  const formatType = (format as string) || 'table';

  if (formatType === 'cell') {
    return cellEntries;
  }

  // clear redundant cells
  table.children?.forEach((rowEl) => {
    const rowElement = rowEl as TTableRowElement;

    const filteredChildren = rowElement.children?.filter((cellEl) => {
      const cellElement = cellEl as TTableCellElement;
      return !!cellElement?.children.length;
    });

    rowElement.children = filteredChildren;
  });

  return [[table, tablePath]];
};
