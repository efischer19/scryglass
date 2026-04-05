/**
 * Minimal RFC 4180 CSV parser.
 *
 * Handles:
 * - Quoted fields containing commas, newlines, and escaped double-quotes
 * - Unquoted fields
 * - CRLF and LF line endings
 *
 * Does NOT handle every edge case in the RFC but covers the patterns
 * produced by Moxfield and similar tools.
 */
export function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  const len = input.length;

  // <= len (not < len) so the last row is processed when input lacks a trailing newline
  while (i <= len) {
    const { row, nextIndex } = parseRow(input, i, len);
    // Only add non-empty rows (skip trailing blank lines)
    if (row.length > 1 || row[0] !== '') {
      rows.push(row);
    }
    i = nextIndex;
  }

  return rows;
}

function parseRow(
  input: string,
  start: number,
  len: number,
): { row: string[]; nextIndex: number } {
  const fields: string[] = [];
  let i = start;

  // <= len (not < len) so trailing commas produce an empty final field per RFC 4180
  while (i <= len) {
    // End of input
    if (i === len) {
      if (fields.length > 0) {
        // Trailing comma produced an empty last field
        fields.push('');
      }
      return { row: fields.length > 0 ? fields : [''], nextIndex: len + 1 };
    }

    const ch = input[i];

    // Line break signals end of row
    if (ch === '\r' || ch === '\n') {
      if (fields.length === 0) {
        // Empty row — push an empty single-field row marker
        fields.push('');
      }
      // Consume \r\n or \n
      let next = i + 1;
      if (ch === '\r' && next < len && input[next] === '\n') {
        next++;
      }
      return { row: fields, nextIndex: next };
    }

    // Parse the next field
    const { value, nextIndex } = parseField(input, i, len);
    fields.push(value);
    i = nextIndex;

    // After a field, expect comma (more fields), line break, or end of input
    if (i < len && input[i] === ',') {
      i++; // skip comma, continue to next field
    }
  }

  return { row: fields, nextIndex: len + 1 };
}

function parseField(
  input: string,
  start: number,
  len: number,
): { value: string; nextIndex: number } {
  if (start < len && input[start] === '"') {
    return parseQuotedField(input, start, len);
  }
  return parseUnquotedField(input, start, len);
}

function parseQuotedField(
  input: string,
  start: number,
  len: number,
): { value: string; nextIndex: number } {
  let i = start + 1; // skip opening quote
  let value = '';

  while (i < len) {
    if (input[i] === '"') {
      // Escaped quote ("") or closing quote
      if (i + 1 < len && input[i + 1] === '"') {
        value += '"';
        i += 2;
      } else {
        // Closing quote
        return { value, nextIndex: i + 1 };
      }
    } else {
      value += input[i];
      i++;
    }
  }

  // Unterminated quote — return what we have
  return { value, nextIndex: i };
}

function parseUnquotedField(
  input: string,
  start: number,
  len: number,
): { value: string; nextIndex: number } {
  let i = start;
  while (i < len && input[i] !== ',' && input[i] !== '\r' && input[i] !== '\n') {
    i++;
  }
  return { value: input.slice(start, i), nextIndex: i };
}
