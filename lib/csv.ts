/**
 * CSV for Excel.
 *
 * Excel on Windows assumes the system codepage unless the file starts with a
 * UTF-8 byte order mark, which turns Thai text into mojibake. The BOM below is
 * what makes the export open correctly.
 */
export const UTF8_BOM = '﻿';

/** Excel is happiest with CRLF line endings. */
const LINE_END = '\r\n';

function escapeCell(value: string): string {
  // A leading =, +, - or @ makes Excel treat the cell as a formula. Prefixing
  // a tab keeps the text as text without changing what the reader sees.
  const guarded = /^[=+\-@]/.test(value) ? `\t${value}` : value;

  return /[",\r\n\t]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

export function toCsv(rows: ReadonlyArray<ReadonlyArray<string | number | null | undefined>>): string {
  return (
    UTF8_BOM +
    rows
      .map((row) => row.map((cell) => escapeCell(cell === null || cell === undefined ? '' : String(cell))).join(','))
      .join(LINE_END) +
    LINE_END
  );
}

export function csvFilename(prefix: string, now: Date): string {
  const stamp = now.toISOString().slice(0, 16).replace(/[:T]/g, '-');
  return `${prefix}-${stamp}.csv`;
}
