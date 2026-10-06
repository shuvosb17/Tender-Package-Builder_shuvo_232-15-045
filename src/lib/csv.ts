function cell(value: string | number | undefined): string {
  const s = value === undefined ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** UTF-8 CSV with a BOM so Excel shows Bangla correctly. */
export function toCsv(header: string[], rows: (string | number | undefined)[][]): string {
  const lines = [header, ...rows].map((r) => r.map(cell).join(','));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
