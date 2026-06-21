import type { TableData, TableRow } from "../types/table";

function removeBom(value: string): string {
  return value.replace(/^\uFEFF/, "");
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());

  return result;
}

function countDelimiterOutsideQuotes(line: string, delimiter: string): number {
  let count = 0;
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"') {
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      count += 1;
    }
  }

  return count;
}

function detectDelimiter(firstLine: string): string {
  const candidates = [";", ",", "\t"];

  return candidates
    .map((delimiter) => ({
      delimiter,
      count: countDelimiterOutsideQuotes(firstLine, delimiter),
    }))
    .sort((a, b) => b.count - a.count)[0].delimiter;
}

function parseCsvRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let currentLine = "";
  let insideQuotes = false;

  const normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let index = 0; index < normalizedText.length; index += 1) {
    const char = normalizedText[index];
    const nextChar = normalizedText[index + 1];

    if (char === '"' && nextChar === '"') {
      currentLine += '""';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      currentLine += char;
      continue;
    }

    if (char === "\n" && !insideQuotes) {
      if (currentLine.trim() !== "") {
        rows.push(splitCsvLine(currentLine, delimiter));
      }

      currentLine = "";
      continue;
    }

    currentLine += char;
  }

  if (currentLine.trim() !== "") {
    rows.push(splitCsvLine(currentLine, delimiter));
  }

  return rows;
}

export function parseCsvTable(csv: string): TableData {
  const cleanedCsv = removeBom(csv).trim();

  if (!cleanedCsv) {
    throw new Error("Plik CSV jest pusty.");
  }

  const firstLine = cleanedCsv.split(/\r\n|\n|\r/)[0];

  if (!firstLine) {
    throw new Error("Nie znaleziono nagłówków w pliku CSV.");
  }

  const delimiter = detectDelimiter(firstLine);
  const parsedRows = parseCsvRows(cleanedCsv, delimiter);

  if (parsedRows.length < 2) {
    return {
      headers: [],
      rows: [],
    };
  }

  const headers = parsedRows[0].map((header) => removeBom(header).trim());

  const rows: TableRow[] = parsedRows.slice(1).map((cells) => {
    const row: TableRow = {};

    headers.forEach((header, index) => {
      row[header] = cells[index]?.trim() ?? "";
    });

    return row;
  });

  return {
    headers,
    rows,
  };
}