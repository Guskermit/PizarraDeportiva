"use client";

import { useId, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type FlatTableColumn = {
  key: string;
  label: string;
  /** CSS width for the column; omit to let it grow to fill remaining space. */
  width?: string;
};

export type FlatTableRow = {
  id: string;
  searchText: string;
  cells: React.ReactNode[];
};

export function FlatTable({
  columns,
  rows,
  searchPlaceholder = "Buscar...",
  emptyMessage,
}: {
  columns: FlatTableColumn[];
  rows: FlatTableRow[];
  searchPlaceholder?: string;
  emptyMessage: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const searchId = useId();

  const filteredRows = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((row) => row.searchText.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div className="grid w-full gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={searchId}
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {filteredRows.length} {filteredRows.length === 1 ? "resultado" : "resultados"}
        </span>
      </div>

      <div className="w-full overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className="text-[0.7rem] tracking-wider text-muted-foreground uppercase"
                >
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row) => (
                <TableRow key={row.id}>
                  {row.cells.map((cell, j) => (
                    <TableCell
                      key={j}
                      style={columns[j]?.width ? { width: columns[j].width } : undefined}
                      className="whitespace-normal"
                    >
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

