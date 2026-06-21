import type { TableData, TableRow } from "../types/table";

function makeUniqueHeaders(headers: string[]): string[] {
  const counts = new Map<string, number>();

  return headers.map((header) => {
    const cleanHeader = header.trim();
    const currentCount = counts.get(cleanHeader) ?? 0;
    counts.set(cleanHeader, currentCount + 1);

    if (currentCount === 0) {
      return cleanHeader;
    }

    return `${cleanHeader} (${currentCount + 1})`;
  });
}

export function parseHtmlTable(html: string): TableData {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");
  const table = document.querySelector("table");

  if (!table) {
    throw new Error("Nie znaleziono tabeli w pliku HTML.");
  }

  const rawHeaders = Array.from(table.querySelectorAll("tr:first-child th")).map(
    (cell) => cell.textContent?.trim() ?? ""
  );

  const headers = makeUniqueHeaders(rawHeaders);

  if (headers.length === 0) {
    throw new Error("Nie znaleziono nagłówków tabeli.");
  }

  const rows: TableRow[] = Array.from(table.querySelectorAll("tr"))
    .slice(1)
    .map((row) => {
      const cells = Array.from(row.querySelectorAll("td"));
      const result: TableRow = {};

      headers.forEach((header, index) => {
        result[header] = cells[index]?.textContent?.trim() ?? "";
      });

      return result;
    })
    .filter((row) =>
      Object.values(row).some((value) => value.trim() !== "")
    );

  return {
    headers,
    rows,
  };
}