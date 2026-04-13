import type {
  DocumentItem,
  DocumentLayout,
  DocumentMargins,
} from "@/modules/documents/document.types";

export const GENERATED_DOCUMENT_MIME_TYPE =
  "application/vnd.kora.generated-document";

export const DEFAULT_DOCUMENT_MARGINS: DocumentMargins = {
  top: 18,
  right: 18,
  bottom: 18,
  left: 18,
};

function normalizeText(value: string) {
  return value.replace(/\r\n/g, "\n");
}

function normalizeOptionalText(value?: string) {
  const normalized = normalizeText(value ?? "").trim();
  return normalized || undefined;
}

function clampMargin(value: number | undefined, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(80, Math.round(value)));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function renderTextBlock(text: string, className: string) {
  const normalized = normalizeText(text).trim();
  if (!normalized) return "";

  return normalized
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p class="${className}">${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`
    )
    .join("");
}

export function isGeneratedDocument(doc: DocumentItem) {
  return (
    doc.mimeType === GENERATED_DOCUMENT_MIME_TYPE ||
    doc.location.startsWith("/Documentos generados")
  );
}

export function buildGeneratedDocumentFile(content: string) {
  return new Blob([content], { type: "text/plain;charset=utf-8" });
}

export function normalizeDocumentMargins(
  margins?: Partial<DocumentMargins>
): DocumentMargins {
  return {
    top: clampMargin(margins?.top, DEFAULT_DOCUMENT_MARGINS.top),
    right: clampMargin(margins?.right, DEFAULT_DOCUMENT_MARGINS.right),
    bottom: clampMargin(margins?.bottom, DEFAULT_DOCUMENT_MARGINS.bottom),
    left: clampMargin(margins?.left, DEFAULT_DOCUMENT_MARGINS.left),
  };
}

export function getDocumentLayout(layout?: DocumentLayout) {
  return {
    header: normalizeOptionalText(layout?.header) ?? "",
    footer: normalizeOptionalText(layout?.footer) ?? "",
    includeAssociationLogo: Boolean(layout?.includeAssociationLogo),
    margins: normalizeDocumentMargins(layout?.margins),
  };
}

export function extractGeneratedDocumentBody(content: string, name: string) {
  const lines = normalizeText(content).split("\n");
  if (lines.length === 0) return "";

  if (lines[0]?.trim() === name.trim()) {
    const bodyLines = lines.slice(1);
    if (bodyLines[0]?.trim() === "") {
      bodyLines.shift();
    }
    return bodyLines.join("\n").trim();
  }

  return normalizeText(content).trim();
}

export function composeGeneratedDocumentContent(name: string, body: string) {
  const finalName = name.trim();
  const finalBody = normalizeText(body).trim();

  if (!finalBody) return finalName;

  return `${finalName}\n\n${finalBody}`;
}

export function buildGeneratedDocumentLines(options: {
  name: string;
  body: string;
  layout?: DocumentLayout;
  associationLogoUrl?: string;
}) {
  const { name, body, layout, associationLogoUrl } = options;
  const effectiveLayout = getDocumentLayout(layout);
  const lines: string[] = [];

  if (effectiveLayout.includeAssociationLogo && associationLogoUrl) {
    lines.push("[Logo de la asociacion]");
  }

  if (effectiveLayout.header) {
    lines.push(...effectiveLayout.header.split(/\r?\n/));
  }

  if (
    (effectiveLayout.includeAssociationLogo && associationLogoUrl) ||
    effectiveLayout.header
  ) {
    lines.push("");
  }

  lines.push(...composeGeneratedDocumentContent(name, body).split(/\r?\n/));

  if (effectiveLayout.footer) {
    lines.push("");
    lines.push(...effectiveLayout.footer.split(/\r?\n/));
  }

  return lines;
}

export function getGeneratedDocumentFilename(
  name: string,
  extension: "html" | "pdf"
) {
  if (/\.[a-z0-9]{2,5}$/i.test(name)) {
    return name.replace(/\.[a-z0-9]{2,5}$/i, `.${extension}`);
  }

  return `${name}.${extension}`;
}

export function buildGeneratedDocumentHtml(options: {
  name: string;
  body: string;
  layout?: DocumentLayout;
  associationLogoUrl?: string;
}) {
  const { name, body, layout, associationLogoUrl } = options;
  const effectiveLayout = getDocumentLayout(layout);
  const bodyHtml = renderTextBlock(body, "doc-paragraph");
  const headerHtml = effectiveLayout.header
    ? renderTextBlock(effectiveLayout.header, "doc-meta")
    : "";
  const footerHtml = effectiveLayout.footer
    ? renderTextBlock(effectiveLayout.footer, "doc-footer-text")
    : "";
  const logoHtml =
    effectiveLayout.includeAssociationLogo && associationLogoUrl
      ? `<img class="doc-logo" src="${escapeHtml(associationLogoUrl)}" alt="Logo de la asociacion" />`
      : "";

  return [
    "<!doctype html>",
    '<html lang="es">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${escapeHtml(name)}</title>`,
    "<style>",
    `@page { size: A4; margin: ${effectiveLayout.margins.top}mm ${effectiveLayout.margins.right}mm ${effectiveLayout.margins.bottom}mm ${effectiveLayout.margins.left}mm; }`,
    "body { margin: 0; background: #ffffff; color: #0f172a; font-family: Inter, Arial, sans-serif; }",
    ".doc { min-height: 100vh; }",
    ".doc-header { display: flex; align-items: flex-start; gap: 18px; padding-bottom: 18px; border-bottom: 1px solid #dbe3f0; }",
    ".doc-logo { max-width: 88px; max-height: 88px; object-fit: contain; }",
    ".doc-header-copy { flex: 1; min-width: 0; }",
    ".doc-title { margin: 28px 0 0; font-size: 28px; line-height: 1.15; font-weight: 700; }",
    ".doc-body { margin-top: 18px; }",
    ".doc-paragraph { margin: 0 0 14px; font-size: 14px; line-height: 1.7; white-space: normal; }",
    ".doc-meta { margin: 0 0 8px; font-size: 12px; line-height: 1.6; color: #475569; }",
    ".doc-footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #dbe3f0; }",
    ".doc-footer-text { margin: 0 0 8px; font-size: 12px; line-height: 1.6; color: #475569; }",
    "</style>",
    "</head>",
    "<body>",
    '<main class="doc">',
    '<header class="doc-header">',
    logoHtml,
    '<div class="doc-header-copy">',
    headerHtml,
    `<h1 class="doc-title">${escapeHtml(name)}</h1>`,
    "</div>",
    "</header>",
    `<section class="doc-body">${bodyHtml}</section>`,
    footerHtml ? `<footer class="doc-footer">${footerHtml}</footer>` : "",
    "</main>",
    "</body>",
    "</html>",
  ].join("");
}

export function downloadGeneratedDocumentHtml(filename: string, html: string) {
  triggerDownload(new Blob([html], { type: "text/html;charset=utf-8" }), filename);
}
