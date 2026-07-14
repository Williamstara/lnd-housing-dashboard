import { utils, writeFile } from "xlsx";

export function exportRowsToXlsx(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number>>
): void {
  const worksheet = utils.aoa_to_sheet([headers, ...rows]);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "Data");
  writeFile(workbook, filename);
}
