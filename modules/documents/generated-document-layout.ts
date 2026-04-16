import type {
  DocumentItem,
  DocumentLayout,
  DocumentMargins,
} from "@/modules/documents/document.types";

export const GENERATED_DOCUMENT_MIME_TYPE =
  "application/vnd.kora.generated-document";

export type GeneratedDocumentTokenContext = {
  locale?: string;
  date?: string | Date;
  association?: {
    name?: string;
    logoUrl?: string;
    taxId?: string;
    contactEmail?: string;
    phone?: string;
    location?: string;
    address?: string;
    representatives?: Array<{
      name?: string;
      role?: string;
    }>;
  } | null;
  admin?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
};

export const GENERATED_DOCUMENT_TOKENS = [
  "{{nombre_asociacion}}",
  "{{fecha_actual}}",
  "{{responsable}}",
  "{{correo_contacto}}",
  "{{telefono_contacto}}",
  "{{direccion_asociacion}}",
  "{{cif_asociacion}}",
] as const;

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

function normalizeInlineText(value?: string | null) {
  return (value ?? "").trim();
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

function renderBodyBlock(text: string) {
  const normalized = normalizeText(text).trim();
  if (!normalized) return "";

  return normalized
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length > 0 && lines.every((line) => /^[-*]\s+/.test(line))) {
        return [
          '<ul class="doc-list">',
          ...lines.map(
            (line) => `<li>${escapeHtml(line.replace(/^[-*]\s+/, ""))}</li>`
          ),
          "</ul>",
        ].join("");
      }

      return `<p class="doc-paragraph">${escapeHtml(block).replace(/\n/g, "<br />")}</p>`;
    })
    .join("");
}

function getCurrentDateLabel(
  value: GeneratedDocumentTokenContext["date"],
  locale: string
) {
  const source =
    value instanceof Date ? value : value ? new Date(value) : new Date();

  if (Number.isNaN(source.getTime())) {
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date());
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(source);
}

function getResponsibleName(context?: GeneratedDocumentTokenContext) {
  const representative = context?.association?.representatives?.find((item) =>
    normalizeInlineText(item.name)
  );
  const adminName = [context?.admin?.firstName, context?.admin?.lastName]
    .map((value) => normalizeInlineText(value))
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    normalizeInlineText(representative?.name) ||
    adminName ||
    normalizeInlineText(context?.association?.name) ||
    "Responsable de la asociacion"
  );
}

function getAddressLine(context?: GeneratedDocumentTokenContext) {
  return (
    normalizeInlineText(context?.association?.address) ||
    normalizeInlineText(context?.association?.location)
  );
}

function trimExtraBlankLines(value: string) {
  const compacted: string[] = [];
  let blankCount = 0;

  normalizeText(value)
    .split("\n")
    .forEach((line) => {
      const normalizedLine = line.replace(/[ \t]+$/g, "");

      if (normalizedLine.trim() === "") {
        blankCount += 1;
        if (blankCount <= 2) {
          compacted.push("");
        }
        return;
      }

      blankCount = 0;
      compacted.push(normalizedLine);
    });

  return compacted.join("\n").trim();
}

export function resolveGeneratedDocumentText(
  value: string,
  context?: GeneratedDocumentTokenContext
) {
  const normalized = normalizeText(value ?? "");
  if (!normalized.trim()) return "";

  const locale = normalizeInlineText(context?.locale) || "es-ES";
  const replacements: Record<(typeof GENERATED_DOCUMENT_TOKENS)[number], string> =
    {
      "{{nombre_asociacion}}":
        normalizeInlineText(context?.association?.name) || "Asociacion",
      "{{fecha_actual}}": getCurrentDateLabel(context?.date, locale),
      "{{responsable}}": getResponsibleName(context),
      "{{correo_contacto}}":
        normalizeInlineText(context?.association?.contactEmail) ||
        normalizeInlineText(context?.admin?.email),
      "{{telefono_contacto}}": normalizeInlineText(context?.association?.phone),
      "{{direccion_asociacion}}": getAddressLine(context),
      "{{cif_asociacion}}": normalizeInlineText(context?.association?.taxId),
    };

  let resolved = normalized;

  (
    Object.entries(replacements) as Array<
      [(typeof GENERATED_DOCUMENT_TOKENS)[number], string]
    >
  ).forEach(([token, replacement]) => {
    resolved = resolved.split(token).join(replacement);
  });

  return trimExtraBlankLines(resolved);
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
  tokenContext?: GeneratedDocumentTokenContext;
}) {
  const { name, body, layout, associationLogoUrl, tokenContext } = options;
  const effectiveLayout = getDocumentLayout(layout);
  const resolvedName =
    resolveGeneratedDocumentText(name, tokenContext) || name.trim();
  const resolvedBody = resolveGeneratedDocumentText(body, tokenContext);
  const resolvedHeader = effectiveLayout.header
    ? resolveGeneratedDocumentText(effectiveLayout.header, tokenContext)
    : "";
  const resolvedFooter = effectiveLayout.footer
    ? resolveGeneratedDocumentText(effectiveLayout.footer, tokenContext)
    : "";
  const lines: string[] = [];

  if (effectiveLayout.includeAssociationLogo && associationLogoUrl) {
    lines.push("[Logo de la asociacion]");
  }

  if (resolvedHeader) {
    lines.push(...resolvedHeader.split(/\r?\n/));
  }

  if (
    (effectiveLayout.includeAssociationLogo && associationLogoUrl) ||
    resolvedHeader
  ) {
    lines.push("");
  }

  lines.push(
    ...composeGeneratedDocumentContent(resolvedName, resolvedBody).split(/\r?\n/)
  );

  if (resolvedFooter) {
    lines.push("");
    lines.push(...resolvedFooter.split(/\r?\n/));
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
  tokenContext?: GeneratedDocumentTokenContext;
}) {
  const { name, body, layout, associationLogoUrl, tokenContext } = options;
  const effectiveLayout = getDocumentLayout(layout);
  const resolvedName =
    resolveGeneratedDocumentText(name, tokenContext) || name.trim();
  const resolvedBody = resolveGeneratedDocumentText(body, tokenContext);
  const resolvedHeader = effectiveLayout.header
    ? resolveGeneratedDocumentText(effectiveLayout.header, tokenContext)
    : "";
  const resolvedFooter = effectiveLayout.footer
    ? resolveGeneratedDocumentText(effectiveLayout.footer, tokenContext)
    : "";
  const bodyHtml = renderBodyBlock(resolvedBody);
  const headerHtml = renderTextBlock(resolvedHeader, "doc-meta");
  const footerHtml = renderTextBlock(resolvedFooter, "doc-footer-text");
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
    `<title>${escapeHtml(resolvedName)}</title>`,
    "<style>",
    "@page { size: A4; margin: 0; }",
    "html, body { min-height: 100%; }",
    "body { margin: 0; background: #eff6ff; color: #0f172a; font-family: Inter, Arial, sans-serif; }",
    ".page { padding: 24px; }",
    ".sheet { width: min(100%, 210mm); min-height: 297mm; margin: 0 auto; background: #ffffff; box-shadow: 0 24px 60px -28px rgba(15, 23, 42, 0.28); }",
    `.doc { min-height: 297mm; box-sizing: border-box; padding: ${effectiveLayout.margins.top}mm ${effectiveLayout.margins.right}mm ${effectiveLayout.margins.bottom}mm ${effectiveLayout.margins.left}mm; }`,
    ".doc-header { display: flex; align-items: flex-start; gap: 18px; padding-bottom: 18px; border-bottom: 1px solid #dbe3f0; }",
    ".doc-logo { max-width: 88px; max-height: 88px; object-fit: contain; }",
    ".doc-header-copy { flex: 1; min-width: 0; }",
    ".doc-title { margin: 28px 0 0; font-size: 28px; line-height: 1.15; font-weight: 700; }",
    ".doc-body { margin-top: 18px; }",
    ".doc-paragraph { margin: 0 0 14px; font-size: 14px; line-height: 1.7; white-space: normal; }",
    ".doc-list { margin: 0 0 18px; padding-left: 22px; font-size: 14px; line-height: 1.7; }",
    ".doc-list li { margin: 0 0 8px; }",
    ".doc-meta { margin: 0 0 8px; font-size: 12px; line-height: 1.6; color: #475569; }",
    ".doc-footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #dbe3f0; }",
    ".doc-footer-text { margin: 0 0 8px; font-size: 12px; line-height: 1.6; color: #475569; }",
    "@media (max-width: 900px) { .page { padding: 0; } .sheet { width: 100%; min-height: auto; box-shadow: none; } .doc { min-height: auto; } }",
    "@media print { body { background: #ffffff; } .page { padding: 0; } .sheet { width: auto; min-height: auto; box-shadow: none; margin: 0; } .doc { min-height: auto; } }",
    "</style>",
    "</head>",
    "<body>",
    '<div class="page">',
    '<main class="sheet">',
    '<article class="doc">',
    '<header class="doc-header">',
    logoHtml,
    '<div class="doc-header-copy">',
    headerHtml,
    `<h1 class="doc-title">${escapeHtml(resolvedName)}</h1>`,
    "</div>",
    "</header>",
    `<section class="doc-body">${bodyHtml}</section>`,
    footerHtml ? `<footer class="doc-footer">${footerHtml}</footer>` : "",
    "</article>",
    "</main>",
    "</div>",
    "</body>",
    "</html>",
  ].join("");
}

export function downloadGeneratedDocumentHtml(filename: string, html: string) {
  triggerDownload(new Blob([html], { type: "text/html;charset=utf-8" }), filename);
}
