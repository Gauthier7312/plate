import {
  findNode,
  getBlockAbove,
  getPluginOptions,
  getPluginType,
  insertElements,
  PlateEditor,
  TElement,
  Value,
  withoutNormalizing,
} from '@udecode/plate-core';
import { Path } from 'slate';
import { ELEMENT_TABLE, ELEMENT_TH } from '../createTablePlugin';
import { TablePlugin } from '../types';
import { getEmptyCellNode } from '../utils/getEmptyCellNode';
import { getCellTypes } from '../utils/index';

export const insertTableColumn = <V extends Value>(
  editor: PlateEditor<V>,
  {
    disableSelect,
    fromCell,
    header,
  }: {
    header?: boolean;

    /**
     * Path of the cell to insert the column from.
     */
    fromCell?: Path;

    /**
     * Disable selection after insertion.
     */
    disableSelect?: boolean;
  } = {}
) => {
  const cellEntry = fromCell
    ? findNode(editor, {
        at: fromCell,
        match: { type: getCellTypes(editor) },
      })
    : getBlockAbove(editor, {
        match: { type: getCellTypes(editor) },
      });
  if (!cellEntry) return;

  const [, cellPath] = cellEntry;

  const tableEntry = getBlockAbove(editor, {
    match: { type: getPluginType(editor, ELEMENT_TABLE) },
    at: cellPath,
  });
  if (!tableEntry) return;

  const [tableNode] = tableEntry;

  const nextCellPath = Path.next(cellPath);
  const currentRowIndex = cellPath[cellPath.length - 2];

  const { newCellChildren } = getPluginOptions<TablePlugin, V>(
    editor,
    ELEMENT_TABLE
  );

  withoutNormalizing(editor, () => {
    // for each row, insert a new cell
    tableNode.children.forEach((row, rowIndex) => {
      const insertCellPath = [...nextCellPath];
      insertCellPath[cellPath.length - 2] = rowIndex;

      const isHeaderRow =
        header === undefined
          ? (row as TElement).children[0].type ===
            getPluginType(editor, ELEMENT_TH)
          : header;

      insertElements(
        editor,
        getEmptyCellNode(editor, {
          header: isHeaderRow,
          newCellChildren,
        }),
        {
          at: insertCellPath,
          select: !disableSelect && rowIndex === currentRowIndex,
        }
      );
    });
  });
};