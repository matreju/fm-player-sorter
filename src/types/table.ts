export type SortDirection = "asc" | "desc";

export type SortConfig = {
  column: string;
  direction: SortDirection;
} | null;

export type TableRow = Record<string, string>;

export type TableData = {
  headers: string[];
  rows: TableRow[];
};

export type StoredTable = TableData & {
  fileName: string;
};