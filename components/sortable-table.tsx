"use client";

import { useState, useMemo, useCallback } from "react";
import { TableHead } from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export type SortDirection = "asc" | "desc" | null;

export interface SortState {
  column: string | null;
  direction: SortDirection;
}

/**
 * Reusable hook for client-side table sorting.
 * Sort state persists as long as the component is mounted (i.e. stays on the same page).
 */
export function useSortableTable<T>(data: T[], defaultSort?: SortState) {
  const [sort, setSort] = useState<SortState>(defaultSort ?? { column: null, direction: null });

  const handleSort = useCallback((column: string) => {
    setSort((prev) => {
      if (prev.column !== column) return { column, direction: "asc" };
      if (prev.direction === "asc") return { column, direction: "desc" };
      if (prev.direction === "desc") return { column: null, direction: null }; // reset
      return { column, direction: "asc" };
    });
  }, []);

  const sorted = useMemo(() => {
    if (!sort.column || !sort.direction) return data;

    return [...data].sort((a, b) => {
      const aVal = (a as any)[sort.column!];
      const bVal = (b as any)[sort.column!];

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sort.direction === "asc" ? -1 : 1;
      if (bVal == null) return sort.direction === "asc" ? 1 : -1;

      // Boolean sort
      if (typeof aVal === "boolean") {
        return sort.direction === "asc"
          ? (aVal === bVal ? 0 : aVal ? 1 : -1)
          : (aVal === bVal ? 0 : aVal ? -1 : 1);
      }

      // String sort
      if (typeof aVal === "string") {
        const cmp = aVal.localeCompare(bVal, "id", { sensitivity: "base" });
        return sort.direction === "asc" ? cmp : -cmp;
      }

      // Number sort
      const cmp = (aVal as number) - (bVal as number);
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }, [data, sort]);

  return { sorted, sort, handleSort };
}

/**
 * Sortable table header cell - shows sort arrows and handles click.
 */
export function SortableHead({
  column,
  label,
  currentSort,
  onSort,
  className = "",
}: {
  column: string;
  label: string;
  currentSort: SortState;
  onSort: (column: string) => void;
  className?: string;
}) {
  const isActive = currentSort.column === column;

  return (
    <TableHead
      className={`cursor-pointer select-none hover:bg-slate-100 transition-colors ${className}`}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1.5">
        <span>{label}</span>
        {isActive && currentSort.direction === "asc" && (
          <ArrowUp className="h-3 w-3 text-blue-600" />
        )}
        {isActive && currentSort.direction === "desc" && (
          <ArrowDown className="h-3 w-3 text-blue-600" />
        )}
        {!isActive && (
          <ArrowUpDown className="h-3 w-3 text-slate-300" />
        )}
      </div>
    </TableHead>
  );
}
