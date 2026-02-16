export type PdfColumn = {
  label: string;
  width: number;
};

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

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetData>${rowsXml}</sheetData>` +
    `</worksheet>`
  );
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

export function downloadCsv(filename: string, rows: string[][]) {
  const lines = rows.map((row) => row.map(escapeCsv).join(","));
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  triggerDownload(blob, filename);
}

export function downloadPdf(
  filename: string,
  title: string,
  columns: PdfColumn[],
  rows: string[][]
) {
  const formatCell = (value: string, width: number) =>
    value.padEnd(width, " ").slice(0, width);

  const headerLine = columns
    .map((col) => formatCell(col.label, col.width))
    .join(" | ");
  const separatorLine = columns
    .map((col) => "-".repeat(col.width))
    .join("-+-");

  const dataLines = rows.map((row) =>
    columns
      .map((col, idx) => formatCell(row[idx] ?? "", col.width))
      .join(" | ")
  );

  const pdfContent = buildPdf([
    title,
    "",
    headerLine,
    separatorLine,
    ...(dataLines.length ? dataLines : ["Sin datos"]),
  ]);

  const blob = new Blob([pdfContent], { type: "application/pdf" });
  triggerDownload(blob, filename);
}

export function downloadXlsx(
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
