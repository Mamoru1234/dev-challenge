export interface CellData {
  value: string;
  result: string;
}

export interface GetSheetOutput {
  [cell_id: string]: CellData;
}

export interface CreateCellInput {
  sheetId: string;
  cellId: string;
  value: string;
}
