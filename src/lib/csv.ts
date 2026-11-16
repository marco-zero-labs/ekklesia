/** Leitura e escrita de CSV (separador ; ou , detectado pela 1ª linha; aspas duplas). */

export function detectDelimiter(firstLine: string): ';' | ',' | '\t' {
  const count = (c: string) => firstLine.split(c).length - 1;
  const tab = count('\t');
  const semi = count(';');
  const comma = count(',');
  if (tab > semi && tab > comma) return '\t';
  return semi >= comma ? ';' : ',';
}

export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const delim = detectDelimiter(clean.split(/\r?\n/)[0] ?? '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(cell.trim());
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some((c) => c !== '')) rows.push(row);
  return rows;
}

const esc = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** CSV com ; (abre direto no Excel em português). */
export function toCsv(rows: (string | number)[][]): string {
  return '﻿' + rows.map((r) => r.map((v) => esc(String(v))).join(';')).join('\r\n');
}
