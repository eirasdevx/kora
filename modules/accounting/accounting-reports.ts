import {
  getAccountingAccountByKey,
  getAccountingCatalog as getConfiguredAccountingCatalog,
  getTransactionAccountingAccountKey,
  type AccountingAccount,
  type AssociationAccountingSettings,
} from "@/core/session/accounting-settings";
import {
  Transaction,
  TransactionCategoryLabels,
} from "@/modules/accounting/transaction.types";

export type AccountingJournalRow = {
  id: string;
  date: string;
  concept: string;
  categoryLabel: string;
  accountCode: string;
  accountLabel: string;
  debit: number;
  credit: number;
  runningBalance: number;
};

export type AccountingLedgerEntry = {
  id: string;
  date: string;
  concept: string;
  categoryLabel: string;
  debit: number;
  credit: number;
  balance: number;
};

export type AccountingLedgerGroup = {
  account: AccountingAccount;
  debitTotal: number;
  creditTotal: number;
  balance: number;
  entries: AccountingLedgerEntry[];
};

export type AccountingAccountSummary = {
  account: AccountingAccount;
  movementCount: number;
  debitTotal: number;
  creditTotal: number;
  balance: number;
  lastEntryDate?: string;
};

function compareTransactions(a: Transaction, b: Transaction) {
  const byDate = new Date(a.date).getTime() - new Date(b.date).getTime();
  if (byDate !== 0) return byDate;

  const byCreated = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  if (byCreated !== 0) return byCreated;

  return a.concept.localeCompare(b.concept, "es");
}

function getPostedTransactions(transactions: Transaction[]) {
  return [...transactions]
    .filter((transaction) => transaction.status === "completed")
    .sort(compareTransactions);
}

export function resolveAccountingAccount(
  transaction: Transaction,
  settings?: AssociationAccountingSettings | null
) {
  const account = getAccountingAccountByKey(
    settings,
    transaction.accountingAccountKey ??
      getTransactionAccountingAccountKey(transaction.category, transaction.type)
  );

  return {
    ...account,
    code:
      settings != null ? account.code : transaction.accountCode?.trim() || account.code,
    label:
      settings != null
        ? account.label
        : transaction.accountLabel?.trim() || account.label,
  };
}

export function getAccountingCatalog(settings?: AssociationAccountingSettings | null) {
  return getConfiguredAccountingCatalog(settings);
}

export function buildJournalRows(
  transactions: Transaction[],
  settings?: AssociationAccountingSettings | null
) {
  let runningBalance = 0;

  return getPostedTransactions(transactions).map((transaction) => {
    const account = resolveAccountingAccount(transaction, settings);
    const debit = transaction.type === "expense" ? transaction.amount : 0;
    const credit = transaction.type === "income" ? transaction.amount : 0;
    runningBalance += credit - debit;

    return {
      id: transaction.id,
      date: transaction.date,
      concept: transaction.concept,
      categoryLabel: TransactionCategoryLabels[transaction.category],
      accountCode: account.code,
      accountLabel: account.label,
      debit,
      credit,
      runningBalance,
    };
  });
}

export function buildLedgerGroups(
  transactions: Transaction[],
  settings?: AssociationAccountingSettings | null
): AccountingLedgerGroup[] {
  const groups = new Map<string, AccountingLedgerGroup>();

  getPostedTransactions(transactions).forEach((transaction) => {
    const account = resolveAccountingAccount(transaction, settings);
    const debit = transaction.type === "expense" ? transaction.amount : 0;
    const credit = transaction.type === "income" ? transaction.amount : 0;

    const existing = groups.get(account.key) ?? {
      account,
      debitTotal: 0,
      creditTotal: 0,
      balance: 0,
      entries: [],
    };

    existing.debitTotal += debit;
    existing.creditTotal += credit;
    existing.balance += credit - debit;
    existing.entries.push({
      id: transaction.id,
      date: transaction.date,
      concept: transaction.concept,
      categoryLabel: TransactionCategoryLabels[transaction.category],
      debit,
      credit,
      balance: existing.balance,
    });

    groups.set(account.key, existing);
  });

  return Array.from(groups.values()).sort((a, b) =>
    a.account.code.localeCompare(b.account.code, "es", {
      numeric: true,
      sensitivity: "base",
    })
  );
}

export function buildAccountSummaries(
  transactions: Transaction[],
  settings?: AssociationAccountingSettings | null
): AccountingAccountSummary[] {
  const summaries = new Map<string, AccountingAccountSummary>();

  getPostedTransactions(transactions).forEach((transaction) => {
    const account = resolveAccountingAccount(transaction, settings);
    const debit = transaction.type === "expense" ? transaction.amount : 0;
    const credit = transaction.type === "income" ? transaction.amount : 0;
    const existing = summaries.get(account.key) ?? {
      account,
      movementCount: 0,
      debitTotal: 0,
      creditTotal: 0,
      balance: 0,
      lastEntryDate: undefined,
    };

    existing.movementCount += 1;
    existing.debitTotal += debit;
    existing.creditTotal += credit;
    existing.balance += credit - debit;
    existing.lastEntryDate = transaction.date;
    summaries.set(account.key, existing);
  });

  return getAccountingCatalog(settings).map(
    (account) =>
      summaries.get(account.key) ?? {
        account,
        movementCount: 0,
        debitTotal: 0,
        creditTotal: 0,
        balance: 0,
        lastEntryDate: undefined,
      }
  );
}

export function countPendingAccountingItems(transactions: Transaction[]) {
  return transactions.filter((transaction) => transaction.status === "pending")
    .length;
}

export function sumPendingAccountingAmount(transactions: Transaction[]) {
  return transactions
    .filter((transaction) => transaction.status === "pending")
    .reduce(
      (total, transaction) =>
        total + (transaction.type === "income" ? transaction.amount : -transaction.amount),
      0
    );
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
    const remainder = (num - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    num = Math.floor((num - 1) / 26);
  }
  return name;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let current = i;
    for (let bit = 0; bit < 8; bit += 1) {
      current = current & 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
    }
    table[i] = current >>> 0;
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
        .map((cell, columnIndex) => {
          const cellRef = `${columnName(columnIndex)}${rowIndex + 1}`;
          return `<c r="${cellRef}" t="inlineStr"><is><t>${xmlEscape(
            cell
          )}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetData>${rowsXml}</sheetData>` +
    `</worksheet>`
  );
}

function normalizePdfText(value: string) {
  const stripped = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
  const safeLines = lines.map((line) => escapePdfText(normalizePdfText(line)));

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

export function downloadRowsAsXlsx(
  filename: string,
  sheetName: string,
  rows: string[][]
) {
  const sheetXml = buildSheetXml(rows);
  const workbookXml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets><sheet name="${xmlEscape(
      sheetName
    )}" sheetId="1" r:id="rId1"/></sheets>` +
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
  triggerDownload(blob, filename);
}

export function buildFixedWidthReportLines(
  title: string,
  columns: Array<{ label: string; width: number }>,
  rows: string[][]
) {
  const fit = (value: string, width: number) => value.padEnd(width, " ").slice(0, width);
  const header = columns.map((column) => fit(column.label, column.width)).join(" | ");
  const separator = columns.map((column) => "-".repeat(column.width)).join("-+-");
  const body = rows.map((row) =>
    row.map((value, index) => fit(value, columns[index].width)).join(" | ")
  );

  return [title, "", header, separator, ...(body.length ? body : ["Sin datos"])];
}

export function downloadLinesAsPdf(filename: string, lines: string[]) {
  const pdfContent = buildPdf(lines);
  const blob = new Blob([pdfContent], { type: "application/pdf" });
  triggerDownload(blob, filename);
}
