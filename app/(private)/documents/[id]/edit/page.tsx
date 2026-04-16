"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import GeneratedDocumentPreview from "@/components/documents/GeneratedDocumentPreview";
import BackLink from "@/components/shared/BackLink";
import Icon from "@/components/shared/Icon";
import { useLocale } from "@/core/i18n/use-locale";
import { useSessionStore } from "@/core/session/session.store";
import { downloadLinesAsPdf } from "@/modules/accounting/accounting-reports";
import { useDocumentsStore } from "@/modules/documents/documents.store";
import {
  GENERATED_DOCUMENT_TOKENS,
  buildGeneratedDocumentFile,
  buildGeneratedDocumentHtml,
  buildGeneratedDocumentLines,
  composeGeneratedDocumentContent,
  downloadGeneratedDocumentHtml,
  extractGeneratedDocumentBody,
  getDocumentLayout,
  getGeneratedDocumentFilename,
  isGeneratedDocument,
  normalizeDocumentMargins,
  resolveGeneratedDocumentText,
  type GeneratedDocumentTokenContext,
} from "@/modules/documents/generated-document-layout";
import {
  DocumentItem,
  DocumentMargins,
} from "@/modules/documents/document.types";

type DraftTarget = "header" | "body" | "footer";

const quickTokens = GENERATED_DOCUMENT_TOKENS;

const navAnchors = [
  { href: "#editor-sidebar", label: "Editor" },
  { href: "#document-preview", label: "Lienzo" },
  { href: "#document-meta", label: "Archivo" },
];

function cx(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

function getGeneratedDocumentContent(doc: DocumentItem) {
  return doc.content?.trim() ? doc.content : `${doc.name}\n\nContenido del documento.`;
}

function formatDateTime(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeEditorText(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

function areMarginsEqual(left: DocumentMargins, right: DocumentMargins) {
  return (
    left.top === right.top &&
    left.right === right.right &&
    left.bottom === right.bottom &&
    left.left === right.left
  );
}

function createLayoutDraft(
  header: string,
  footer: string,
  includeAssociationLogo: boolean,
  margins: DocumentMargins
) {
  return {
    header: normalizeEditorText(header) || undefined,
    footer: normalizeEditorText(footer) || undefined,
    includeAssociationLogo,
    margins: normalizeDocumentMargins(margins),
  };
}

const inputBaseStyles =
  "mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10";

const sectionLabelStyles =
  "text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400";

const toolbarButtonStyles =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 shadow-sm transition hover:border-primary/30 hover:text-primary";

export default function DocumentEditPage() {
  const params = useParams<{ id: string }>();
  const { formatLocale } = useLocale();
  const association = useSessionStore((state) => state.association);
  const admin = useSessionStore((state) => state.admin);
  const { documents, loadDocuments, upsertDocument } = useDocumentsStore();

  const headerRef = useRef<HTMLTextAreaElement | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const footerRef = useRef<HTMLTextAreaElement | null>(null);

  const [hasLoaded, setHasLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [headerDraft, setHeaderDraft] = useState("");
  const [bodyDraft, setBodyDraft] = useState("");
  const [footerDraft, setFooterDraft] = useState("");
  const [includeLogo, setIncludeLogo] = useState(false);
  const [margins, setMargins] = useState<DocumentMargins>({
    top: 18,
    right: 18,
    bottom: 18,
    left: 18,
  });
  const tokenContext = useMemo<GeneratedDocumentTokenContext>(
    () => ({
      association,
      admin,
      locale: formatLocale,
    }),
    [admin, association, formatLocale]
  );

  useEffect(() => {
    void loadDocuments().finally(() => setHasLoaded(true));
  }, [loadDocuments]);

  const documentItem = useMemo(
    () => documents.find((entry) => entry.id === params.id) ?? null,
    [documents, params.id]
  );

  const savedLayout = useMemo(
    () => getDocumentLayout(documentItem?.layout),
    [documentItem?.layout]
  );
  const savedBody = useMemo(() => {
    if (!documentItem) return "";
    return extractGeneratedDocumentBody(
      getGeneratedDocumentContent(documentItem),
      documentItem.name
    );
  }, [documentItem]);

  useEffect(() => {
    if (!documentItem) return;

    setNameDraft(documentItem.name);
    setHeaderDraft(savedLayout.header || association?.name || "");
    setBodyDraft(savedBody);
    setFooterDraft(savedLayout.footer);
    setIncludeLogo(savedLayout.includeAssociationLogo);
    setMargins(savedLayout.margins);
  }, [association?.name, documentItem, savedBody, savedLayout]);

  const normalizedHeaderDraft = normalizeEditorText(headerDraft);
  const normalizedBodyDraft = normalizeEditorText(bodyDraft);
  const normalizedFooterDraft = normalizeEditorText(footerDraft);
  const normalizedMargins = useMemo(
    () => normalizeDocumentMargins(margins),
    [margins]
  );
  const nextLayout = useMemo(
    () =>
      createLayoutDraft(
        headerDraft,
        footerDraft,
        includeLogo,
        normalizedMargins
      ),
    [footerDraft, headerDraft, includeLogo, normalizedMargins]
  );

  const hasChanges = documentItem
    ? nameDraft.trim() !== documentItem.name ||
      normalizedHeaderDraft !== savedLayout.header ||
      normalizedBodyDraft !== savedBody ||
      normalizedFooterDraft !== savedLayout.footer ||
      includeLogo !== savedLayout.includeAssociationLogo ||
      !areMarginsEqual(normalizedMargins, savedLayout.margins)
    : false;

  const topVersion = documentItem?.versions?.[0];
  const versionCount = documentItem?.versions?.length ?? 0;
  const statusLabel = hasChanges ? "Borrador" : "Guardado";

  const handleMarginChange =
    (side: keyof DocumentMargins) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue =
        event.target.value.trim() === "" ? 0 : Number(event.target.value);

      setMargins((current) => ({
        ...current,
        [side]:
          Number.isFinite(nextValue) && nextValue >= 0
            ? Math.min(80, Math.round(nextValue))
            : current[side],
      }));
    };

  const handleDownload = () => {
    if (!documentItem) return;

    const finalName = nameDraft.trim() || documentItem.name;
    downloadGeneratedDocumentHtml(
      getGeneratedDocumentFilename(finalName, "html"),
      buildGeneratedDocumentHtml({
        name: finalName,
        body: normalizedBodyDraft,
        layout: nextLayout,
        associationLogoUrl: association?.logoUrl,
        tokenContext,
      })
    );
  };

  const handlePdfDownload = () => {
    if (!documentItem) return;

    const finalName = nameDraft.trim() || documentItem.name;
    downloadLinesAsPdf(
      getGeneratedDocumentFilename(finalName, "pdf"),
      buildGeneratedDocumentLines({
        name: finalName,
        body: normalizedBodyDraft,
        layout: nextLayout,
        associationLogoUrl: association?.logoUrl,
        tokenContext,
      })
    );
  };

  const handleSave = async () => {
    if (!documentItem) return;

    const finalName = nameDraft.trim() || documentItem.name;
    const nextContent = composeGeneratedDocumentContent(
      finalName,
      normalizedBodyDraft
    );
    const file = buildGeneratedDocumentFile(nextContent);
    const now = new Date();
    const versionIndex = (documentItem.versions?.length ?? 0) + 1;
    const versionAuthor =
      resolveGeneratedDocumentText("{{responsable}}", {
        ...tokenContext,
        date: now.toISOString(),
      }) || "Tu usuario";

    setIsSaving(true);
    try {
      await upsertDocument({
        ...documentItem,
        name: finalName,
        content: nextContent,
        layout: nextLayout,
        file,
        size: file.size,
        updatedAt: now.toISOString(),
        versions: [
          {
            id: crypto.randomUUID(),
            label: `v${versionIndex}.0 - Documento actualizado`,
            author: versionAuthor,
            time: new Intl.DateTimeFormat(formatLocale, {
              hour: "2-digit",
              minute: "2-digit",
            }).format(now),
          },
          ...(documentItem.versions ?? []),
        ],
      });

      setNameDraft(finalName);
      setHeaderDraft(nextLayout.header ?? "");
      setBodyDraft(normalizedBodyDraft);
      setFooterDraft(nextLayout.footer ?? "");
      setIncludeLogo(nextLayout.includeAssociationLogo);
      setMargins(nextLayout.margins);
    } finally {
      setIsSaving(false);
    }
  };

  const insertToken = (target: DraftTarget, token: string) => {
    const element =
      target === "header"
        ? headerRef.current
        : target === "body"
          ? bodyRef.current
          : footerRef.current;
    const currentValue =
      target === "header"
        ? headerDraft
        : target === "body"
          ? bodyDraft
          : footerDraft;
    const setValue =
      target === "header"
        ? setHeaderDraft
        : target === "body"
          ? setBodyDraft
          : setFooterDraft;

    if (!element) {
      setValue(`${currentValue}${currentValue ? "\n" : ""}${token}`);
      return;
    }

    const start = element.selectionStart ?? currentValue.length;
    const end = element.selectionEnd ?? currentValue.length;
    const before = currentValue.slice(0, start);
    const after = currentValue.slice(end);
    const needsLeadingSpace = before.length > 0 && !/[\s\n]$/.test(before);
    const needsTrailingSpace = after.length > 0 && !/^[\s\n]/.test(after);
    const insertion = `${needsLeadingSpace ? " " : ""}${token}${
      needsTrailingSpace ? " " : ""
    }`;
    const nextValue = `${before}${insertion}${after}`;

    setValue(nextValue);

    requestAnimationFrame(() => {
      const caretPosition = before.length + insertion.length;
      element.focus();
      element.setSelectionRange(caretPosition, caretPosition);
    });
  };

  const scrollToPreview = () => {
    document
      .getElementById("document-preview")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!hasLoaded) {
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <BackLink href="/documents" label="Volver a Documentos" />
          <div className="mt-4 flex items-center gap-3 text-sm text-gray-500">
            <Icon name="hourglass_top" className="text-[18px] text-primary" />
            Cargando documento...
          </div>
        </div>
      </div>
    );
  }

  if (!documentItem) {
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <BackLink href="/documents" label="Volver a Documentos" />
          <div className="mt-4">
            <h1 className="text-2xl font-semibold text-gray-900">
              Editar documento
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              No se encontro el documento solicitado.
            </p>
            <div className="mt-5">
              <Link
                href="/documents"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:border-primary/40 hover:text-primary"
              >
                Volver a documentos
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isGeneratedDocument(documentItem)) {
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <BackLink href="/documents" label="Volver a Documentos" />
          <div className="mt-4">
            <h1 className="text-2xl font-semibold text-gray-900">
              {documentItem.name}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Este documento no tiene editor interno. Solo los documentos
              generados desde Kora se editan en esta pantalla.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <BackLink href="/documents" label="Volver a Documentos" />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="break-words text-2xl font-semibold text-gray-900">
                  {nameDraft.trim() || documentItem.name}
                </h1>
                <span
                  className={cx(
                    "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold",
                    hasChanges
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                  )}
                >
                  {statusLabel}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Editor visual para documentos generados desde Kora.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={handleDownload}
                className={toolbarButtonStyles}
              >
                <Icon name="download" className="text-[18px]" />
                Descargar HTML
              </button>
              <button
                type="button"
                onClick={handlePdfDownload}
                className={toolbarButtonStyles}
              >
                <Icon name="picture_as_pdf" className="text-[18px]" />
                Descargar PDF
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <Icon name="save" className="text-[18px]" />
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-5 py-3 sm:px-6">
          {navAnchors.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-semibold text-gray-600 transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
            >
              {item.label}
            </a>
          ))}

          <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1">
              <Icon name="history" className="text-[14px]" />
              {versionCount} versiones
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1">
              <Icon name="shield" className="text-[14px]" />
              {documentItem.security}
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside id="editor-sidebar" className="xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-5 py-5">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white">
                  <Icon name="edit_document" className="text-[22px]" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-gray-900">
                    {nameDraft.trim() || documentItem.name}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {topVersion?.label || "Draft v1.0"}
                  </p>
                </div>
              </div>

              <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">
                <Icon name="web_stories" className="text-[18px]" />
                Editor visual
              </div>
            </div>
            
            <div className="space-y-6 px-5 py-5">
              <section className="space-y-4">
                <div>
                  <p className={sectionLabelStyles}>Documento</p>
                  <label className="mt-3 block text-sm font-semibold text-gray-700">
                    Nombre visible
                    <input
                      value={nameDraft}
                      onChange={(event) => setNameDraft(event.target.value)}
                      className={inputBaseStyles}
                      placeholder="Nombre del documento"
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-4 border-t border-gray-100 pt-6">
                <div className="flex items-center justify-between gap-3">
                  <p className={sectionLabelStyles}>Cabecera</p>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600">
                    <input
                      type="checkbox"
                      checked={includeLogo}
                      onChange={(event) => setIncludeLogo(event.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20"
                    />
                    Logo
                  </label>
                </div>

                <textarea
                  ref={headerRef}
                  value={headerDraft}
                  onChange={(event) => setHeaderDraft(event.target.value)}
                  className={cx(inputBaseStyles, "min-h-[120px] resize-y")}
                  placeholder="Nombre de la asociacion, referencia, fecha o datos previos"
                />

                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-3">
                  <p className="text-xs font-semibold text-gray-600">
                    Logo activo
                  </p>
                  <div className="mt-3 flex min-h-[72px] items-center justify-center rounded-md bg-white">
                    {association?.logoUrl ? (
                      <img
                        src={association.logoUrl}
                        alt={association?.name || "Logo de la asociacion"}
                        className="max-h-14 w-auto object-contain"
                      />
                    ) : (
                      <p className="px-4 text-center text-xs text-gray-500">
                        No hay logo cargado en la asociacion.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-4 border-t border-gray-100 pt-6">
                <div className="flex items-center justify-between gap-3">
                  <p className={sectionLabelStyles}>Cuerpo</p>
                  <button
                    type="button"
                    onClick={() => insertToken("body", "{{fecha_actual}}")}
                    className="text-xs font-semibold text-primary hover:text-primary/80"
                  >
                    Insertar fecha
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {quickTokens.map((token) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() => insertToken("body", token)}
                      className="rounded-md border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/30 hover:bg-primary/10"
                    >
                      {token}
                    </button>
                  ))}
                </div>

                <textarea
                  ref={bodyRef}
                  value={bodyDraft}
                  onChange={(event) => setBodyDraft(event.target.value)}
                  className={cx(inputBaseStyles, "min-h-[360px] resize-y")}
                  placeholder="Contenido principal del documento"
                />
              </section>

              <section className="space-y-4 border-t border-gray-100 pt-6">
                <p className={sectionLabelStyles}>Pie de pagina</p>
                <textarea
                  ref={footerRef}
                  value={footerDraft}
                  onChange={(event) => setFooterDraft(event.target.value)}
                  className={cx(inputBaseStyles, "min-h-[140px] resize-y")}
                  placeholder="Firma, notas legales, contacto o cierre del documento"
                />
              </section>

              <section className="space-y-4 border-t border-gray-100 pt-6">
                <p className={sectionLabelStyles}>Margenes</p>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ["top", "Superior"],
                      ["right", "Derecho"],
                      ["bottom", "Inferior"],
                      ["left", "Izquierdo"],
                    ] as Array<[keyof DocumentMargins, string]>
                  ).map(([side, label]) => (
                    <label
                      key={side}
                      className="block text-xs font-semibold text-gray-500"
                    >
                      {label}
                      <div className="mt-2 flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          max={80}
                          value={margins[side]}
                          onChange={handleMarginChange(side)}
                          className="w-full bg-transparent text-sm font-semibold text-gray-700 outline-none"
                        />
                        <span className="text-xs text-gray-400">mm</span>
                      </div>
                    </label>
                  ))}
                </div>
              </section>
            </div>

            <div className="border-t border-gray-200 px-5 py-5">
              <button
                type="button"
                onClick={scrollToPreview}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
              >
                <Icon name="visibility" className="text-[18px]" />
                Ir a la vista previa
              </button>
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          <div className="rounded-lg border border-blue-100 bg-[#f4f7ff] p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 border-b border-blue-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Lienzo del documento
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Vista previa del documento con cabecera, bloques y pie.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                  <Icon name="draft" className="text-[14px]" />
                  {hasChanges ? "Cambios sin guardar" : "Documento al dia"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                  <Icon name="straighten" className="text-[14px]" />
                  {normalizedMargins.top}/{normalizedMargins.right}/
                  {normalizedMargins.bottom}/{normalizedMargins.left} mm
                </span>
              </div>
            </div>

            <div id="document-preview" className="mt-6">
              <GeneratedDocumentPreview
                title={nameDraft.trim() || documentItem.name}
                body={normalizedBodyDraft}
                layout={nextLayout}
                associationLogoUrl={association?.logoUrl}
                tokenContext={tokenContext}
                heightClassName="h-[720px] sm:h-[960px] xl:h-[1100px]"
                ariaLabel="Vista previa exacta del documento generado"
              />
            </div>

            <div
              id="document-meta"
              className="mt-6 border-t border-blue-100 pt-4"
            >
              <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Ultima actualizacion
                  </dt>
                  <dd className="mt-2 text-sm font-semibold text-slate-700">
                    {formatDateTime(documentItem.updatedAt, formatLocale)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Propietario
                  </dt>
                  <dd className="mt-2 text-sm font-semibold text-slate-700">
                    {documentItem.owner}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Acceso
                  </dt>
                  <dd className="mt-2 text-sm font-semibold text-slate-700">
                    {(documentItem.access?.join(", ") || "TU").toUpperCase()}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Exportacion
                  </dt>
                  <dd className="mt-2 text-sm font-semibold text-slate-700">
                    HTML y PDF
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
