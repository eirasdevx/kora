"use client";

import {
  tableBodyStyles,
  tableEmptyCellStyles,
  tableHeadCellStyles,
  tableHeadStyles,
  tableMinWidthStyles,
  tableRowStyles,
  tableWrapperStyles,
} from "@/components/shared/tableStyles";

type DataTableColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  className?: string;
};

type DataTableRow = {
  key: string;
  cells: React.ReactNode[];
  className?: string;
};

type DataTableProps = {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  emptyLabel?: string;
  tableClassName?: string;
  containerClassName?: string;
};

function cx(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

const ALIGN_CLASS: Record<
  NonNullable<DataTableColumn["align"]>,
  string
> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export default function DataTable({
  columns,
  rows,
  emptyLabel = "Sin datos disponibles.",
  tableClassName,
  containerClassName,
}: DataTableProps) {
  return (
    <div className={cx(tableWrapperStyles, containerClassName)}>
      <table
        className={cx(
          tableMinWidthStyles,
          tableClassName
        )}
      >
        <thead className={tableHeadStyles}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cx(
                  tableHeadCellStyles,
                  ALIGN_CLASS[column.align ? "left"],
                  column.className
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={tableBodyStyles}>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={tableEmptyCellStyles}>
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.key}
                className={cx(tableRowStyles, row.className)}
              >
                {row.cells.map((cell, idx) => {
                  const column = columns[idx];
                  return (
                    <td
                      key={`${row.key}-${idx}`}
                      className={cx(
                        "px-6 py-4",
                        column?.align
                          ? ALIGN_CLASS[column.align]
                          : "text-left"
                      )}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
