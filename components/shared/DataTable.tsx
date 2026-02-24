"use client";

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
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className={cx("overflow-x-auto", containerClassName)}>
      <table
        className={cx(
          "min-w-[700px] w-full text-sm",
          tableClassName
        )}
      >
        <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cx(
                  "px-6 py-4 font-semibold",
                  ALIGN_CLASS[column.align ?? "left"],
                  column.className
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-gray-700">
          {rows.map((row) => (
            <tr
              key={row.key}
              className={cx(
                "border-b border-gray-100 last:border-0",
                row.className
              )}
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
