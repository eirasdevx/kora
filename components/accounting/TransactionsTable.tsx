"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import { useLocale } from "@/core/i18n/use-locale";
import { tableWrapperStyles } from "@/components/shared/tableStyles";
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
  completed:
    "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100",
  pending: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100",
};

const PAGE_SIZE = 8;
const TOOLBAR_BUTTON_STYLES =
  "inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50";
const TOOLBAR_ICON_BUTTON_STYLES =
  "inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50";
const SEARCH_INPUT_STYLES =
  "w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";
const FILTER_FIELD_STYLES =
  "mt-2 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10";
const CATEGORY_BADGE_STYLES =
  "inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600";
const EDIT_ACTION_STYLES =
  "rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50";
const DELETE_ACTION_STYLES =
  "rounded-xl border border-rose-200 bg-rose-50 px-4 py-1.5 text-xs font-semibold text-rose-600 shadow-sm transition hover:bg-rose-100";
const TABLE_HEAD_STYLES =
  "border-y border-slate-100 bg-slate-50/90 text-[11px] uppercase tracking-[0.12em] text-slate-400";
const TABLE_HEAD_CELL_STYLES = "px-6 py-4 font-semibold";
const TABLE_BODY_STYLES = "divide-y divide-slate-100 text-slate-700";
const TABLE_ROW_STYLES = "transition-colors hover:bg-slate-50/70";
const TABLE_FOOTER_STYLES =
  "flex flex-col gap-3 border-t border-slate-100 px-6 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between";
const TABLE_PAGER_BUTTON_STYLES =
  "rounded-xl border px-4 py-1.5 text-xs font-semibold shadow-sm transition";
const TABLE_PAGER_BUTTON_ENABLED_STYLES =
  "border-slate-200 bg-white text-slate-600 hover:bg-slate-50";
const TABLE_PAGER_BUTTON_DISABLED_STYLES =
  "border-slate-100 bg-slate-50 text-slate-300 shadow-none";
const TABLE_PAGER_NUMBER_STYLES =
  "flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50";
const TABLE_PAGER_CURRENT_STYLES =
  "flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-xs font-semibold text-primary";

function formatAmount(
  amount: number,
  type: "income" | "expense",
  locale: string
) {
  const value = type === "expense" ? -amount : amount;
  return value.toLocaleString(locale, {
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

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale);
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
  const { formatLocale } = useLocale();
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
      const concept = tx.concept?.toLowerCase() ? "";
      const description = tx.description?.toLowerCase() ? "";
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
    const end = Math.min(totalPages, start + 2);
    if (end - start < 2) {
      start = Math.max(1, end - 2);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPageSafe, totalPages]);

  const canPrev = currentPageSafe > 1;
  const canNext = currentPageSafe < totalPages;

  const exportRows = useMemo(() => {
    return filteredTransactions.map((tx) => ({
      fecha: formatDate(tx.date, formatLocale),
      concepto: tx.concept,
      estado: TransactionStatusLabels[tx.status],
      importe: formatAmount(tx.amount, tx.type, formatLocale),
      notas: tx.description ? "",
    }));
  }, [filteredTransactions, formatLocale]);

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
    setCurrentPage(1);
  };

  const showEmptyState = transactions.length === 0;
  const showNoResults = !showEmptyState && filteredTransactions.length === 0;
  const confirmDeleteLabel = confirmDelete
    ? confirmDelete.concept?.trim() || "esta transacción"
    : "esta transacción";

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              aria-expanded={filtersOpen}
              className={TOOLBAR_BUTTON_STYLES}
            >
              <span className="material-symbols-outlined text-[18px]">
                tune
              </span>
              Filtros
            </button>
            {filtersOpen ? (
              <div className="absolute left-0 z-20 mt-2 w-80 rounded-3xl border border-slate-200 bg-white p-4 shadow-xl">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                      Tipo
                    </label>
                    <select
                      value={typeFilter}
                      onChange={(event) => {
                        setTypeFilter(
                          event.target.value as "income" | "expense" | "all"
                        );
                        setCurrentPage(1);
                      }}
                      className={FILTER_FIELD_STYLES}
                    >
                      <option value="all">Todos</option>
                      <option value="income">Ingreso</option>
                      <option value="expense">Gasto</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                      Estado
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(event) => {
                        setStatusFilter(
                          event.target.value as keyof typeof TransactionStatusLabels | "all"
                        );
                        setCurrentPage(1);
                      }}
                      className={FILTER_FIELD_STYLES}
                    >
                      <option value="all">Todos</option>
                      <option value="completed">Completado</option>
                      <option value="pending">Pendiente</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                      Categoría
                    </label>
                    <select
                      value={categoryFilter}
                      onChange={(event) => {
                        setCategoryFilter(
                          event.target.value as keyof typeof TransactionCategoryLabels | "all"
                        );
                        setCurrentPage(1);
                      }}
                      className={FILTER_FIELD_STYLES}
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
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                      Fecha
                    </label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(event) => {
                          setDateFrom(event.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                      />
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(event) => {
                          setDateTo(event.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
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
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
                    >
                      Listo
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <span className="material-symbols-outlined text-[18px] leading-none">
                search
              </span>
            </span>
            <input
              type="text"
              placeholder="Buscar transacciones por concepto o notas..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              className={SEARCH_INPUT_STYLES}
            />
          </div>
        </div>
        <div className="flex flex-nowrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportXlsx}
            aria-label="Exportar XLSX"
            title="Exportar XLSX"
            className={TOOLBAR_ICON_BUTTON_STYLES}
          >
            <span className="material-symbols-outlined text-[18px]">
              grid_on
            </span>
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            aria-label="Exportar PDF"
            title="Exportar PDF"
            className={TOOLBAR_ICON_BUTTON_STYLES}
          >
            <span className="material-symbols-outlined text-[18px]">
              picture_as_pdf
            </span>
          </button>
        </div>
      </div>

      {showEmptyState ? (
        <div className="px-6 py-10 text-sm text-slate-500">
          No hay transacciones registradas.
        </div>
      ) : showNoResults ? (
        <div className="px-6 py-10 text-sm text-slate-500">
          No hay resultados para los filtros seleccionados.
        </div>
      ) : (
        <div className={tableWrapperStyles}>
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className={TABLE_HEAD_STYLES}>
              <tr>
                <th className={`${TABLE_HEAD_CELL_STYLES} text-left`}>Fecha</th>
                <th className={`${TABLE_HEAD_CELL_STYLES} text-left`}>
                  Concepto
                </th>
                <th className={`${TABLE_HEAD_CELL_STYLES} text-left`}>
                  Categoría
                </th>
                <th className={`${TABLE_HEAD_CELL_STYLES} text-left`}>
                  Estado
                </th>
                <th className={`${TABLE_HEAD_CELL_STYLES} text-right`}>
                  Importe
                </th>
                <th className={`${TABLE_HEAD_CELL_STYLES} text-right`}>
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className={TABLE_BODY_STYLES}>
              {pagedTransactions.map((tx) => (
                <tr key={tx.id} className={TABLE_ROW_STYLES}>
                  <td className="whitespace-nowrap px-6 py-5 text-sm font-medium text-slate-700">
                    {formatDate(tx.date, formatLocale)}
                  </td>

                  <td className="px-6 py-5">
                    <div className="text-[15px] font-semibold text-slate-900">
                      {tx.concept}
                    </div>
                    {tx.description && (
                      <div className="mt-1 text-xs text-slate-500">
                        {tx.description}
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-5">
                    <span className={CATEGORY_BADGE_STYLES}>
                      {TransactionCategoryLabels[tx.category]}
                    </span>
                  </td>

                  <td className="px-6 py-5">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        STATUS_STYLES[tx.status]
                      }`}
                    >
                      {TransactionStatusLabels[tx.status]}
                    </span>
                  </td>

                  <td
                    className={`whitespace-nowrap px-6 py-5 text-right text-[15px] font-semibold ${
                      tx.type === "income"
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {formatAmount(tx.amount, tx.type, formatLocale)}
                  </td>

                  <td className="px-6 py-5 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link
                        href={`/accounting/${tx.id}/edit`}
                        className={EDIT_ACTION_STYLES}
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(tx)}
                        className={DELETE_ACTION_STYLES}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={TABLE_FOOTER_STYLES}>
        <span>
          Mostrando {pagedTransactions.length} de {filteredTransactions.length} transacciones
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage(Math.max(1, currentPageSafe - 1))}
            disabled={!canPrev}
            className={`${TABLE_PAGER_BUTTON_STYLES} ${
              canPrev
                ? TABLE_PAGER_BUTTON_ENABLED_STYLES
                : TABLE_PAGER_BUTTON_DISABLED_STYLES
            }`}
          >
            Anterior
          </button>
          {pageNumbers.map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => setCurrentPage(page)}
              className={
                page === currentPageSafe
                  ? TABLE_PAGER_CURRENT_STYLES
                  : TABLE_PAGER_NUMBER_STYLES
              }
            >
              {page}
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPageSafe + 1))
            }
            disabled={!canNext}
            className={`${TABLE_PAGER_BUTTON_STYLES} ${
              canNext
                ? TABLE_PAGER_BUTTON_ENABLED_STYLES
                : TABLE_PAGER_BUTTON_DISABLED_STYLES
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
