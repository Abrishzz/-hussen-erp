/**
 * Spreadsheet export.
 *
 * We emit CSV rather than pulling in a real .xlsx writer: the only maintained
 * npm build of SheetJS (0.18.5) carries unfixable high-severity advisories, and
 * a CSV opens natively in Excel, Google Sheets and LibreOffice. The BOM below is
 * what makes Excel read the Amharic column values as UTF-8 instead of mojibake.
 */

export type CellValue = string | number | null | undefined

/** Escapes a value for CSV: quotes, embedded quotes, commas and newlines. */
function escapeCell(value: CellValue): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCsv(headers: string[], rows: CellValue[][]): string {
  return [headers, ...rows].map((r) => r.map(escapeCell).join(',')).join('\r\n')
}

/** Triggers a download of `rows` as a spreadsheet file. */
export function downloadSpreadsheet(filename: string, headers: string[], rows: CellValue[][]) {
  const csv = toCsv(headers, rows)
  // UTF-8 BOM so Excel renders Amharic correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
