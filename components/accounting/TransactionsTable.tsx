"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import {
  Transaction,
  TransactionCategoryLabels,
  TransactionStatusLabels,
} from "@/modules/accounting/transaction.types";
import { useTransactionsStore } from "@/modules/accounting/transactions.store";

interface Props {
  transactions: Transaction[];
}

const STATUS_STYLES: Record<keyof typeof TransactionStatusLabels, string> = {
  completed: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
};

const PAGE_SIZE = 8;

function formatAmount(amount: number, type: "income" | "expense") {
  const value = type === "expense" ? -amount : amount;
  return value.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
  });
}

function toStartOfDay(value: string) {
  const date = new Date(`${value}T00:00:00`);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toEndOfDay(value: string) {
  const date = new Date(`${value}T00:00:00`);
  date.setHours(23, 59, 59, 999);
  return date;
}

function matchesDateRange(iso: string | undefined, from: string, to: string) {
  if (!from && !to) return true;
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  if (from) {
    const start = toStartOfDay(from);
    if (date < start) return false;
  }
  if (to) {
    const end = toEndOfDay(to);
    if (date > end) return false;
  }
  return true;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-ES");
}

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnName(index: number) {
  let name = "";
  let num = index + 1;
  while (num > 0) {
    const rem = (num - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    num = Math.floor((num - 1) / 26);
  }
  return name;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number) {
  return Uint8Array.from([value & 0xff, (value >>> 8) & 0xff]);
}

function u32(value: number) {
  return Uint8Array.from([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ]);
}

function concatChunks(chunks: Uint8Array[]) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    out.set(chunk, offset);
    offset += chunk.length;
  });
  return out;
}

function buildZip(files: Array<{ name: string; data: Uint8Array }>) {
  const encoder = new TextEncoder();
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  const records: Array<{
    nameBytes: Uint8Array;
    crc: number;
    size: number;
    offset: number;
  }> = [];

  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const size = file.data.length;
    const crc = crc32(file.data);
    const header = concatChunks([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBytes.length),
      u16(0),
    ]);
    localChunks.push(header, nameBytes, file.data);
    records.push({ nameBytes, crc, size, offset });
    offset += header.length + nameBytes.length + file.data.length;
  });

  let centralSize = 0;
  records.forEach((record) => {
    const centralHeader = concatChunks([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(record.crc),
      u32(record.size),
      u32(record.size),
      u16(record.nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(record.offset),
    ]);
    centralChunks.push(centralHeader, record.nameBytes);
    centralSize += centralHeader.length + record.nameBytes.length;
  });

  const endOfCentral = concatChunks([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(records.length),
    u16(records.length),
    u32(centralSize),
    u32(offset),
    u16(0),
  ]);

  return concatChunks([...localChunks, ...centralChunks, endOfCentral]);
}

function buildSheetXml(rows: string[][]) {
  const rowsXml = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, colIndex) => {
          const cellRef = `${columnName(colIndex)}${rowIndex + 1}`;
          return `<c r="${cellRef}" t="inlineStr"><is><t>${xmlEscape(
            cell
          )}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetData>${rowsXml}</sheetData>` +
    `</worksheet>`;
}

function normalizePdfText(value: string) {
  const stripped = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return stripped.replace(/[^\x20-\x7E]/g, "?");
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPdf(lines: string[]) {
  const fontSize = 10;
  const lineHeight = 14;
  const startX = 40;
  const startY = 800;

  const safeLines = lines.map((line) =>
    escapePdfText(normalizePdfText(line))
  );

  const contentLines: string[] = [];
  contentLines.push("BT");
  contentLines.push(`/F1 ${fontSize} Tf`);
  contentLines.push(`${lineHeight} TL`);
  contentLines.push(`${startX} ${startY} Td`);
  safeLines.forEach((line, index) => {
    if (index > 0) contentLines.push("T*");
    contentLines.push(`(${line}) Tj`);
  });
  contentLines.push("ET");

  const content = `${contentLines.join("\n")}\n`;

  const objects = [
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`,
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`,
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n`,
    `4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`,
    `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objects.forEach((obj) => {
    offsets.push(pdf.length);
    pdf += obj;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

export default function TransactionsTable({ transactions }: Props) {
  const deleteTransaction = useTransactionsStore(
    (s) => s.deleteTransaction
  );
  const [confirmDelete, setConfirmDelete] = useState<Transaction | null>(null);
  const [confirmDeleteFinal, setConfirmDeleteFinal] =
    useState<Transaction | null>(null);
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    keyof typeof TransactionStatusLabels | "all"
  >("all");
  const [typeFilter, setTypeFilter] = useState<"income" | "expense" | "all">(
    "all"
  );
  const [categoryFilter, setCategoryFilter] = useState<
    keyof typeof TransactionCategoryLabels | "all"
  >("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (statusFilter !== "all" && tx.status !== statusFilter) return false;
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (categoryFilter !== "all" && tx.category !== categoryFilter) return false;
      if (!matchesDateRange(tx.date, dateFrom, dateTo)) return false;

      if (!query) return true;
      const concept = tx.concept?.toLowerCase() ?? "";
      const description = tx.description?.toLowerCase() ?? "";
      const statusLabel = TransactionStatusLabels[tx.status].toLowerCase();
      return (
        concept.includes(query) ||
        description.includes(query) ||
        statusLabel.includes(query)
      );
    });
  }, [
    transactions,
    search,
    statusFilter,
    typeFilter,
    categoryFilter,
    dateFrom,
    dateTo,
  ]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE)),
    [filteredTransactions.length]
  );
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pagedTransactions = useMemo(() => {
    const start = (currentPageSafe - 1) * PAGE_SIZE;
    return filteredTransactions.slice(start, start + PAGE_SIZE);
  }, [filteredTransactions, currentPageSafe]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 3) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    let start = Math.max(1, currentPageSafe - 1);
    let end = Math.min(totalPages, start + 2);
    if (end - start < 2) {
      start = Math.max(1, end - 2);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPageSafe, totalPages]);

  const canPrev = currentPageSafe > 1;
  const canNext = currentPageSafe < totalPages;

  useEffect(() => {
    if (currentPage !== currentPageSafe) {
      setCurrentPage(currentPageSafe);
    }
  }, [currentPage, currentPageSafe]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, typeFilter, categoryFilter, dateFrom, dateTo]);

  const exportRows = useMemo(() => {
    return filteredTransactions.map((tx) => ({
      fecha: formatDate(tx.date),
      concepto: tx.concept,
      estado: TransactionStatusLabels[tx.status],
      importe: formatAmount(tx.amount, tx.type),
      notas: tx.description ?? "",
    }));
  }, [filteredTransactions]);

  const handleExportCsv = () => {
    const header = [
      "Fecha",
      "Concepto",
      "Estado",
      "Importe",
      "Notas adicionales",
    ];
    const lines = [header.map(escapeCsv).join(",")];
    exportRows.forEach((row) => {
      lines.push(
        [
          row.fecha,
          row.concepto,
          row.estado,
          row.importe,
          row.notas,
        ]
          .map(escapeCsv)
          .join(",")
      );
    });
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    triggerDownload(blob, "contabilidad-transacciones.csv");
  };

  const handleExportPdf = () => {
    const columns = [
      { label: "Fecha", width: 12 },
      { label: "Concepto", width: 28 },
      { label: "Estado", width: 12 },
      { label: "Importe", width: 14 },
      { label: "Notas adicionales", width: 36 },
    ];

    const formatCell = (value: string, width: number) =>
      value.padEnd(width, " ").slice(0, width);

    const headerLine = columns
      .map((col) => formatCell(col.label, col.width))
      .join(" | ");
    const separatorLine = columns
      .map((col) => "-".repeat(col.width))
      .join("-+-");

    const dataLines = exportRows.map((row) =>
      [
        formatCell(row.fecha, columns[0].width),
        formatCell(row.concepto, columns[1].width),
        formatCell(row.estado, columns[2].width),
        formatCell(row.importe, columns[3].width),
        formatCell(row.notas || "-", columns[4].width),
      ].join(" | ")
    );

    const pdfContent = buildPdf([
      "Transacciones de contabilidad",
      "",
      headerLine,
      separatorLine,
      ...(dataLines.length ? dataLines : ["Sin datos"]),
    ]);

    const blob = new Blob([pdfContent], { type: "application/pdf" });
    triggerDownload(blob, "contabilidad-transacciones.pdf");
  };

  const handleExportXlsx = () => {
    const rows = [
      [
        "Fecha",
        "Concepto",
        "Estado",
        "Importe",
        "Notas adicionales",
      ],
      ...exportRows.map((row) => [
        row.fecha,
        row.concepto,
        row.estado,
        row.importe,
        row.notas || "",
      ]),
    ];

    const sheetXml = buildSheetXml(rows);
    const workbookXml =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
      `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      `<sheets><sheet name="Transacciones" sheetId="1" r:id="rId1"/></sheets>` +
      `</workbook>`;
    const relsXml =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
      `</Relationships>`;
    const workbookRelsXml =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
      `</Relationships>`;
    const contentTypesXml =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
      `</Types>`;

    const encoder = new TextEncoder();
    const zipData = buildZip([
      { name: "[Content_Types].xml", data: encoder.encode(contentTypesXml) },
      { name: "_rels/.rels", data: encoder.encode(relsXml) },
      { name: "xl/workbook.xml", data: encoder.encode(workbookXml) },
      {
        name: "xl/_rels/workbook.xml.rels",
        data: encoder.encode(workbookRelsXml),
      },
      { name: "xl/worksheets/sheet1.xml", data: encoder.encode(sheetXml) },
    ]);

    const blob = new Blob([zipData], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    triggerDownload(blob, "contabilidad-transacciones.xlsx");
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setCategoryFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const showEmptyState = transactions.length === 0;
  const showNoResults = !showEmptyState && filteredTransactions.length === 0;
  const confirmDeleteLabel = confirmDelete
    ? confirmDelete.concept?.trim() || "esta transacción"
    : "esta transacción";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              aria-expanded={filtersOpen}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              <span className="material-symbols-outlined text-[16px]">
                tune
              </span>
              Filtros
            </button>
            {filtersOpen ? (
              <div className="absolute left-0 z-20 mt-2 w-80 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-400">
                      Tipo
                    </label>
                    <select
                      value={typeFilter}
                      onChange={(event) =>
                        setTypeFilter(event.target.value as "income" | "expense" | "all")
                      }
                      className="mt-2 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                    >
                      <option value="all">Todos</option>
                      <option value="income">Ingreso</option>
                      <option value="expense">Gasto</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-400">
                      Estado
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(
                          event.target.value as keyof typeof TransactionStatusLabels | "all"
                        )
                      }
                      className="mt-2 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                    >
                      <option value="all">Todos</option>
                      <option value="completed">Completado</option>
                      <option value="pending">Pendiente</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-400">
                      Categor??a
                    </label>
                    <select
                      value={categoryFilter}
                      onChange={(event) =>
                        setCategoryFilter(
                          event.target.value as keyof typeof TransactionCategoryLabels | "all"
                        )
                      }
                      className="mt-2 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                    >
                      <option value="all">Todas</option>
                      {Object.entries(TransactionCategoryLabels).map(
                        ([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-gray-400">
                      Fecha
                    </label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(event) => setDateFrom(event.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                      />
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(event) => setDateTo(event.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="text-xs font-semibold text-gray-400 hover:text-gray-600"
                    >
                      Limpiar filtros
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltersOpen(false)}
                      className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600"
                    >
                      Listo
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
              <span className="material-symbols-outlined text-[16px] leading-none">
                search
              </span>
            </span>
            <input
              type="text"
              placeholder="Buscar transacciones por concepto o notas..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
        </div>
        <div className="flex flex-nowrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportXlsx}
            aria-label="Exportar XLSX"
            title="Exportar XLSX"
            className="inline-flex items-center rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            <span className="material-symbols-outlined text-[16px]">
              grid_on
            </span>
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            aria-label="Exportar PDF"
            title="Exportar PDF"
            className="inline-flex items-center rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            <span className="material-symbols-outlined text-[16px]">
              picture_as_pdf
            </span>
          </button>
        </div>
      </div>

      {showEmptyState ? (
        <div className="px-6 py-8 text-sm text-gray-500">
          No hay transacciones registradas.
        </div>
      ) : showNoResults ? (
        <div className="px-6 py-8 text-sm text-gray-500">
          No hay resultados para los filtros seleccionados.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-6 py-4 text-left">Fecha</th>
              <th className="px-6 py-4 text-left">Concepto</th>
              <th className="px-6 py-4 text-left">Categoría</th>
              <th className="px-6 py-4 text-left">Estado</th>
              <th className="px-6 py-4 text-right">Importe</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {pagedTransactions.map((tx) => (
              <tr
                key={tx.id}
                className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
              >
                <td className="px-6 py-4 text-sm text-gray-600">
                  {formatDate(tx.date)}
                </td>

                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-900">
                    {tx.concept}
                  </div>
                  {tx.description && (
                    <div className="text-gray-500 text-xs">
                      {tx.description}
                    </div>
                  )}
                </td>

                <td className="px-6 py-4">
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                    {TransactionCategoryLabels[tx.category]}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      STATUS_STYLES[tx.status]
                    }`}
                  >
                    {TransactionStatusLabels[tx.status]}
                  </span>
                </td>

                <td
                  className={`px-6 py-4 text-right font-semibold ${
                    tx.type === "income"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatAmount(tx.amount, tx.type)}
                </td>

                <td className="px-6 py-4 text-right">
                  <div className="inline-flex items-center gap-2">
                    <Link
                      href={`/accounting/${tx.id}/edit`}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => setConfirmDelete(tx)}
                      className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Mostrando {pagedTransactions.length} de {filteredTransactions.length} transacciones
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={!canPrev}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              canPrev
                ? "border-gray-200 text-gray-600 hover:bg-gray-50"
                : "border-gray-100 text-gray-300"
            }`}
          >
            Anterior
          </button>
          {pageNumbers.map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => setCurrentPage(page)}
              className={`h-8 w-8 rounded-lg text-xs font-semibold ${
                page === currentPageSafe
                  ? "bg-primary/10 text-primary"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {page}
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={!canNext}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              canNext
                ? "border-gray-200 text-gray-600 hover:bg-gray-50"
                : "border-gray-100 text-gray-300"
            }`}
          >
            Siguiente
          </button>
        </div>
      </div>

      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="¿Eliminar transacción?"
      >
        <p className="mb-6">
          ¿Seguro que quieres eliminar <strong>{confirmDeleteLabel}</strong>?
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmDelete(null)}
            className="px-4 py-2 border rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (confirmDelete) {
                setConfirmDeleteFinal(confirmDelete);
              }
              setConfirmDelete(null);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg"
          >
            Sí, eliminar
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={!!confirmDeleteFinal}
        onClose={() => setConfirmDeleteFinal(null)}
        title="Confirmación final"
      >
        <p className="mb-6 text-red-600 font-medium">
          Esta acción no se puede deshacer.
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmDeleteFinal(null)}
            className="px-4 py-2 border rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={async () => {
              if (confirmDeleteFinal) {
                await deleteTransaction(confirmDeleteFinal.id);
              }
              setConfirmDeleteFinal(null);
            }}
            className="px-4 py-2 bg-red-700 text-white rounded-lg"
          >
            Eliminar definitivamente
          </button>
        </div>
      </Modal>
    </div>
  );
}
