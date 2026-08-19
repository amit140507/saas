import * as React from "react";

import { cn } from "@/lib/utils";

export type ResponsiveTableCell = {
  label?: string;
  content: React.ReactNode;
  className?: string;
  cardClassName?: string;
  valueClassName?: string;
  hideLabel?: boolean;
};

export type ResponsiveTableRow = {
  id: React.Key;
  cells: ResponsiveTableCell[];
  className?: string;
  cardClassName?: string;
};

type ResponsiveTableProps = {
  columns: string[];
  rows: ResponsiveTableRow[];
  emptyText: string;
  className?: string;
  tableClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  rowClassName?: string;
  cardGridClassName?: string;
};

export function ResponsiveTable({
  columns,
  rows,
  emptyText,
  className,
  tableClassName,
  headerClassName,
  bodyClassName,
  rowClassName,
  cardGridClassName,
}: ResponsiveTableProps) {
  const hasRows = rows.length > 0;

  return (
    <div className={cn("text-sm", className)}>
      <div className="hidden overflow-x-auto md:block">
        <table className={cn("w-full border-collapse text-left text-sm", tableClassName)}>
          <thead>
            <tr
              className={cn(
                "border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50",
                headerClassName,
              )}
            >
              {columns.map((column) => (
                <th key={column} className={cn("px-6 py-4", column === "Actions" && "text-right")}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={cn("divide-y divide-zinc-200 text-zinc-700 dark:divide-zinc-800 dark:text-zinc-300", bodyClassName)}>
            {hasRows ? (
              rows.map((row) => (
                <tr key={row.id} className={cn(rowClassName, row.className)}>
                  {row.cells.map((cell, index) => (
                    <td
                      key={`${String(row.id)}-${cell.label ?? columns[index] ?? index}`}
                      className={cn("px-6 py-4", columns[index] === "Actions" && "text-right", cell.className)}
                    >
                      {cell.content}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-zinc-400">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={cn("grid gap-3 md:hidden", cardGridClassName)}>
        {hasRows ? (
          rows.map((row) => (
            <article
              key={row.id}
              className={cn(
                "rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950",
                row.cardClassName,
              )}
            >
              <div className="grid gap-3">
                {row.cells.map((cell, index) => {
                  const label = cell.label ?? columns[index];
                  const isActionCell = label === "Actions";

                  return (
                    <div
                      key={`${String(row.id)}-card-${label ?? index}`}
                      className={cn(
                        isActionCell
                          ? "flex items-center justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800"
                          : "grid gap-1",
                        cell.cardClassName,
                      )}
                    >
                      {!cell.hideLabel && !isActionCell && label && (
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</div>
                      )}
                      <div className={cn("min-w-0 text-zinc-900 dark:text-zinc-100", cell.valueClassName)}>{cell.content}</div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-400 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );
}

type TableRowElement = React.ReactElement<{
  children?: React.ReactNode;
  className?: string;
}>;

type TableCellElement = React.ReactElement<{
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
}>;

type ResponsiveTableFromRowsProps = Omit<ResponsiveTableProps, "rows"> & {
  children: React.ReactNode;
};

export function ResponsiveTableFromRows({ children, columns, emptyText, ...props }: ResponsiveTableFromRowsProps) {
  const childRows = React.Children.toArray(children).filter(Boolean);
  const rows = childRows
    .map((row, rowIndex): ResponsiveTableRow | null => {
      if (!React.isValidElement(row)) {
        return null;
      }

      const rowElement = row as TableRowElement;
      const cells = React.Children.toArray(rowElement.props.children)
        .filter(Boolean)
        .map((cell, cellIndex): ResponsiveTableCell | null => {
          if (!React.isValidElement(cell)) {
            return null;
          }

          const cellElement = cell as TableCellElement;
          const isFullWidthMessage = cellElement.props.colSpan && cellElement.props.colSpan >= columns.length;

          return {
            label: columns[cellIndex],
            content: cellElement.props.children,
            className: cellElement.props.className,
            cardClassName: isFullWidthMessage ? "text-center" : undefined,
            hideLabel: Boolean(isFullWidthMessage),
          };
        })
        .filter((cell): cell is ResponsiveTableCell => Boolean(cell));

      if (cells.length === 0) {
        return null;
      }

      return {
        id: row.key ?? rowIndex,
        cells,
        className: rowElement.props.className,
      };
    })
    .filter((row): row is ResponsiveTableRow => Boolean(row));

  return <ResponsiveTable columns={columns} rows={rows} emptyText={emptyText} {...props} />;
}
