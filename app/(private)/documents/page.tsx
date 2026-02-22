"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Modal from "@/components/Modal";
import PageTopbar from "@/components/PageTopbar";
import { useDocumentsStore } from "@/modules/documents/documents.store";
import {
  DocumentCategory,
  DocumentItem,
  DocumentSecurity,
  DocumentType,
} from "@/modules/documents/document.types";

const filters: Array<DocumentCategory | "Todos"> = [
  "Todos",
  "PDF",
  "Imagenes",
  "Contratos",
  "Hojas de Calculo",
];

const securityStyles: Record<DocumentSecurity, string> = {
  Privado: "bg-blue-50 text-blue-600",
  Compartido: "bg-slate-100 text-slate-600",
  Cifrado: "bg-emerald-50 text-emerald-700",
};

const categoryStyles: Record<DocumentCategory, string> = {
  PDF: "text-blue-600 bg-blue-50",
  Imagenes: "text-purple-600 bg-purple-50",
  Contratos: "text-orange-600 bg-orange-50",
  "Hojas de Calculo": "text-emerald-600 bg-emerald-50",
  Carpetas: "text-slate-600 bg-slate-100",
};

function cx(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

function formatBytes(bytes: number) {
  if (!bytes) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatDate(iso: string) {
  if (!iso) return "-";
  const date = new Date(iso);
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatRelative(iso: string) {
  if (!iso) return "-";
  const now = Date.now();
  const diffMs = now - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return "hace unos segundos";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} horas`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
    if (days < 30) return `hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months} meses`;
  const years = Math.floor(months / 12);
    return `hace ${years} años`;
}

function getExtension(name: string) {
  const parts = name.split(".");
  if (parts.length <= 1) return "";
  return parts.pop()?.toLowerCase() ?? "";
}

function getTypeFromName(name: string): DocumentType {
  const ext = getExtension(name);
  if (["pdf"].includes(ext)) return "pdf";
  if (["doc", "docx", "odt"].includes(ext)) return "doc";
  if (["xls", "xlsx"].includes(ext)) return "sheet";
  if (["csv"].includes(ext)) return "csv";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext))
    return "image";
  return "other";
}

function getCategoryFromType(type: DocumentType): DocumentCategory {
  if (type === "pdf") return "PDF";
  if (type === "doc") return "Contratos";
  if (type === "sheet" || type === "csv") return "Hojas de Calculo";
  if (type === "image") return "Imagenes";
  return "PDF";
}

function buildDocumentFromFile(
  file: File,
  security: DocumentSecurity
): DocumentItem {
  const now = new Date();
  const nowIso = now.toISOString();
  const type = getTypeFromName(file.name);
  const category = getCategoryFromType(type);
  const owner = "Tu usuario";

  return {
    id: crypto.randomUUID(),
    name: file.name,
    category,
    security,
    type,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
    location: "/Documentos",
    owner,
    createdAt: nowIso,
    updatedAt: nowIso,
    file,
    access: ["TU"],
    versions: [
      {
        id: crypto.randomUUID(),
        label: "v1.0 - Subido",
        author: owner,
        time: new Intl.DateTimeFormat("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(now),
      },
    ],
  };
}

function formatSizeLabel(doc: DocumentItem) {
  if (doc.type === "folder") return "Carpeta";
  return formatBytes(doc.size);
}

function FileIcon({
  type,
  className,
}: {
  type: DocumentType;
  className?: string;
}) {
  const iconName =
    type === "folder"
      ? "folder"
      : type === "sheet" || type === "csv"
        ? "table_chart"
        : type === "doc"
          ? "description"
          : type === "image"
            ? "image"
            : "insert_drive_file";
  return (
    <span className={cx("material-symbols-outlined", className)}>
      {iconName}
    </span>
  );
}

export default function DocumentsPage() {
  const {
    documents,
    loadDocuments,
    upsertDocument,
    upsertDocuments,
    deleteDocument,
  } = useDocumentsStore();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<DocumentCategory | "Todos">("Todos");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [privacy, setPrivacy] = useState<"private" | "public">("private");
  const [activeTab, setActiveTab] = useState<
    "Información" | "Historial" | "Acceso"
  >("Información");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [permissionDraft, setPermissionDraft] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<DocumentItem | null>(null);
  const [confirmDeleteFinal, setConfirmDeleteFinal] =
    useState<DocumentItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pageSize = 5;

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const filteredDocuments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((doc) => {
      const matchesSearch = !q || doc.name.toLowerCase().includes(q);
      const matchesFilter = filter === "Todos" || doc.category === filter;
      return matchesSearch && matchesFilter;
    });
  }, [documents, filter, search]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredDocuments.length / pageSize)),
    [filteredDocuments.length, pageSize]
  );
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pagedDocuments = useMemo(() => {
    const start = (currentPageSafe - 1) * pageSize;
    return filteredDocuments.slice(start, start + pageSize);
  }, [filteredDocuments, currentPageSafe, pageSize]);

  useEffect(() => {
    if (currentPage !== currentPageSafe) {
      setCurrentPage(currentPageSafe);
    }
  }, [currentPage, currentPageSafe]);

  const quickAccess = useMemo(() => {
    return [...documents]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 4);
  }, [documents]);

  useEffect(() => {
    if (!selectedId) return;
    if (!filteredDocuments.some((doc) => doc.id === selectedId)) {
      setSelectedId("");
    }
  }, [filteredDocuments, selectedId]);

  const selectedDoc = documents.find((doc) => doc.id === selectedId);
  const confirmDeleteLabel =
    confirmDelete?.name?.trim() || "este documento";

  useEffect(() => {
    setNameDraft(selectedDoc?.name ?? "");
    setEditingName(false);
  }, [selectedDoc?.id]);

  const closeUpload = () => {
    setUploadOpen(false);
    setPendingFiles([]);
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const security: DocumentSecurity =
      privacy === "private" ? "Privado" : "Compartido";
    const docs = files.map((file) => buildDocumentFromFile(file, security));
    await upsertDocuments(docs);
    setPendingFiles(files);
    setSelectedId(docs[0]?.id ?? "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    await handleFilesSelected(event.dataTransfer.files);
  };

  const handleDownload = (doc?: DocumentItem) => {
    if (!doc?.file) return;
    const url = URL.createObjectURL(doc.file);
    const link = document.createElement("a");
    link.href = url;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (doc: DocumentItem) => {
    await deleteDocument(doc.id);
    if (selectedId === doc.id) {
      setSelectedId("");
    }
  };

  const handleRename = async () => {
    if (!selectedDoc) return;
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    const type = getTypeFromName(trimmed);
    const category = getCategoryFromType(type);
    await upsertDocument({
      ...selectedDoc,
      name: trimmed,
      type,
      category,
      updatedAt: new Date().toISOString(),
    });
    setEditingName(false);
  };

  const handleAddPermission = async () => {
    if (!selectedDoc) return;
    const value = permissionDraft.trim();
    if (!value) return;
    const current = selectedDoc.access ?? [];
    if (current.includes(value)) {
      setPermissionDraft("");
      return;
    }
    await upsertDocument({
      ...selectedDoc,
      access: [...current, value],
      updatedAt: new Date().toISOString(),
    });
    setPermissionDraft("");
  };

  const handleRemovePermission = async (value: string) => {
    if (!selectedDoc) return;
    const next = (selectedDoc.access ?? []).filter((item) => item !== value);
    await upsertDocument({
      ...selectedDoc,
      access: next,
      updatedAt: new Date().toISOString(),
    });
  };

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

  return (
    <div className="space-y-6">
      <PageTopbar>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Documentos</h1>
            <p className="text-sm text-gray-500">
              Biblioteca segura para actas, contratos y hojas de calculo.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-80">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                <span className="material-symbols-outlined text-[16px] leading-none">
                  search
                </span>
              </span>
              <input
                type="text"
                placeholder="Buscar documentos, facturas..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <span className="material-symbols-outlined text-[16px]">
                  add
                </span>
              </span>
              Subir Archivo
            </button>
          </div>
        </div>
      </PageTopbar>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div
          className={cx(
            "space-y-6",
            selectedDoc ? "xl:col-span-8" : "xl:col-span-12"
          )}
        >
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Acceso Rapido - Editados recientemente
              </h3>
              <button
                type="button"
                onClick={() => {
                  setFilter("Todos");
                  setSearch("");
                  setCurrentPage(1);
                }}
                className="text-sm font-semibold text-primary"
              >
                Ver todos
              </button>
            </div>
            {quickAccess.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
                Todavia no hay documentos cargados.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {quickAccess.map((doc) => {
                  const locked = doc.security !== "Compartido";
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(doc.id);
                        setFilter("Todos");
                      }}
                      className="group relative rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-primary/40"
                    >
                      {locked ? (
                        <span className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-primary shadow-sm">
                          <span className="material-symbols-outlined text-[16px]">
                            lock
                          </span>
                        </span>
                      ) : null}
                      <div
                        className={cx(
                          "flex h-16 w-16 items-center justify-center rounded-2xl",
                          categoryStyles[doc.category]
                        )}
                      >
                        <FileIcon type={doc.type} className="text-[32px]" />
                      </div>
                      <div className="mt-4">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                          {doc.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatRelative(doc.updatedAt)} - {formatSizeLabel(doc)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Todos los archivos
                </h3>
                <p className="text-xs text-gray-500">
                  Gestiona permisos y organiza la documentacion clave.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    tune
                  </span>
                  Filtros
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={cx(
                    "flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm",
                    viewMode === "list"
                      ? "border-primary/40 bg-gray-50 text-primary"
                      : "border-gray-200 bg-white text-gray-500"
                  )}
                  aria-label="Vista lista"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    view_list
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cx(
                    "flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm",
                    viewMode === "grid"
                      ? "border-primary/40 bg-gray-50 text-primary"
                      : "border-gray-200 bg-white text-gray-500"
                  )}
                  aria-label="Vista cuadrilla"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    grid_view
                  </span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 px-6 pt-4">
              {filters.map((item) => {
                const active = filter === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setFilter(item);
                      setCurrentPage(1);
                    }}
                    className={cx(
                      "rounded-full border px-4 py-1.5 text-xs font-semibold transition",
                      active
                        ? "border-primary bg-primary text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            {viewMode === "list" ? (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-6 py-3 font-semibold">Nombre</th>
                      <th className="px-6 py-3 font-semibold">Seguridad</th>
                      <th className="px-6 py-3 font-semibold">Modificado</th>
                      <th className="px-6 py-3 font-semibold">Tamano</th>
                      <th className="px-6 py-3 font-semibold text-right">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredDocuments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-10 text-center text-sm text-gray-500"
                        >
                          No se encontraron documentos con esos filtros.
                        </td>
                      </tr>
                    ) : (
                      pagedDocuments.map((doc) => {
                        const active = doc.id === selectedId;
                        return (
                          <tr
                            key={doc.id}
                            onClick={() => {
                              setSelectedId(doc.id);
                            }}
                            className={cx(
                              "cursor-pointer transition hover:bg-gray-50",
                              active && "bg-primary/5"
                            )}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <span
                                  className={cx(
                                    "flex h-9 w-9 items-center justify-center rounded-xl text-sm",
                                    categoryStyles[doc.category]
                                  )}
                                >
                                  <FileIcon type={doc.type} className="text-[16px]" />
                                </span>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {doc.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {doc.category}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={cx(
                                  "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                                  securityStyles[doc.security]
                                )}
                              >
                                <span className="material-symbols-outlined text-[14px]">
                                  lock
                                </span>
                                {doc.security}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                              {formatDate(doc.updatedAt)}
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                              {formatSizeLabel(doc)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
                                aria-label="Mas acciones"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  more_vert
                                </span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredDocuments.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                    No se encontraron documentos con esos filtros.
                  </div>
                ) : (
                  pagedDocuments.map((doc) => {
                    const active = doc.id === selectedId;
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(doc.id);
                        }}
                        className={cx(
                          "rounded-2xl border p-4 text-left shadow-sm transition",
                          active
                            ? "border-primary/40 bg-primary/5"
                            : "border-gray-200 bg-white hover:border-primary/30"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <span
                            className={cx(
                              "flex h-10 w-10 items-center justify-center rounded-xl text-sm",
                              categoryStyles[doc.category]
                            )}
                          >
                            <FileIcon type={doc.type} className="text-[20px]" />
                          </span>
                          <span
                            className={cx(
                              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                              securityStyles[doc.security]
                            )}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              lock
                            </span>
                            {doc.security}
                          </span>
                        </div>
                        <div className="mt-3">
                          <p className="text-sm font-semibold text-gray-900">
                            {doc.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {doc.category}
                          </p>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                          <span>{formatDate(doc.updatedAt)}</span>
                          <span>{formatSizeLabel(doc)}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Mostrando {pagedDocuments.length} de {filteredDocuments.length} archivos
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={!canPrev}
                  className={cx(
                    "rounded-lg border px-3 py-1.5 text-sm",
                    canPrev
                      ? "border-gray-200 text-gray-500 hover:bg-gray-50"
                      : "border-gray-200 text-gray-300 cursor-not-allowed"
                  )}
                >
                  Anterior
                </button>
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={cx(
                      "rounded-lg border px-3 py-1.5 text-sm",
                      page === currentPageSafe
                        ? "border-primary bg-primary/5 font-semibold text-primary"
                        : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={!canNext}
                  className={cx(
                    "rounded-lg border px-3 py-1.5 text-sm",
                    canNext
                      ? "border-gray-200 text-gray-500 hover:bg-gray-50"
                      : "border-gray-200 text-gray-300 cursor-not-allowed"
                  )}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </section>
        </div>

        {selectedDoc ? (
          <aside className="xl:col-span-4 space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Detalles del Archivo
                  </h3>
                    <p className="text-xs text-gray-500">
                      Información, versiones y accesos.
                    </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId("")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
                  aria-label="Cerrar panel"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    close
                  </span>
                </button>
              </div>

                <div className="mt-6 rounded-2xl bg-gray-50 p-6 flex items-center justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                    <FileIcon type={selectedDoc.type} className="text-[32px]" />
                  </div>
                </div>

                {editingName ? (
                  <div className="mt-4 space-y-3">
                    <input
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                      placeholder="Nombre del archivo"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleRename}
                        className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNameDraft(selectedDoc.name);
                          setEditingName(false);
                        }}
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">
                        {selectedDoc.name}
                      </h4>
                        <p className="text-xs text-gray-500">
                          Última edición {formatRelative(selectedDoc.updatedAt)}
                        </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingName(true)}
                      className="rounded-xl border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600"
                    >
                      Renombrar
                    </button>
                  </div>
                )}

                <div className="mt-4 border-b border-gray-100 pb-3">
                  <div className="flex gap-4 text-xs font-semibold text-gray-500">
                    {["Información", "Historial", "Acceso"].map((tab) => {
                      const active = activeTab === tab;
                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() =>
                              setActiveTab(
                                tab as "Información" | "Historial" | "Acceso"
                              )
                            }
                          className={cx(
                            "pb-2",
                            active
                              ? "text-primary border-b-2 border-primary"
                              : "hover:text-gray-700"
                          )}
                        >
                          {tab}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {activeTab === "Información" && (
                  <div className="mt-4 space-y-5 text-sm text-gray-600">
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-400">
                        Metadatos
                      </p>
                      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-xs text-gray-400">Tipo</dt>
                          <dd className="font-semibold text-gray-700">
                            {selectedDoc.category}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-400">Tamano</dt>
                          <dd className="font-semibold text-gray-700">
                            {formatSizeLabel(selectedDoc)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-400">Creado</dt>
                          <dd className="font-semibold text-gray-700">
                            {formatDate(selectedDoc.createdAt)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-400">Ubicacion</dt>
                          <dd className="font-semibold text-primary">
                            {selectedDoc.location}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-400">
                        Versiones recientes
                      </p>
                      <div className="mt-3 space-y-3">
                        {selectedDoc.versions && selectedDoc.versions.length > 0 ? (
                          selectedDoc.versions.map((version) => (
                            <div key={version.id} className="flex items-start gap-3">
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                                <span className="material-symbols-outlined text-[16px]">
                                  schedule
                                </span>
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-gray-700">
                                  {version.label}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Subido por {version.author} - {version.time}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">
                            Sin versiones recientes registradas.
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-400">
                        Quien tiene acceso
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        {(selectedDoc.access?.length
                          ? selectedDoc.access
                          : ["TU"]
                        ).map((item) => (
                          <span
                            key={item}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-white bg-primary/10 text-xs font-semibold text-primary shadow-sm"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setPermissionsOpen(true)}
                        className="mt-4 w-full rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary"
                      >
                        Gestionar permisos
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "Historial" && (
                  <div className="mt-4 space-y-3 text-sm text-gray-600">
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <p className="font-semibold text-gray-700">Última actividad</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDate(selectedDoc.updatedAt)} - {selectedDoc.owner}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white p-4">
                      <p className="font-semibold text-gray-700">
                        Permisos actualizados
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatRelative(selectedDoc.updatedAt)} - Equipo Legal
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === "Acceso" && (
                  <div className="mt-4 space-y-3 text-sm text-gray-600">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <p className="font-semibold text-gray-700">Nivel de acceso</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {selectedDoc.security} - 1 colaborador
                      </p>
                    </div>
                    <button className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow">
                      Compartir enlace seguro
                    </button>
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    className={cx(
                      "flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600",
                      !selectedDoc.file && "cursor-not-allowed opacity-50"
                    )}
                    type="button"
                    onClick={() => handleDownload(selectedDoc)}
                    disabled={!selectedDoc.file}
                  >
                    Descargar
                  </button>
                  <button
                    className="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600"
                    type="button"
                    onClick={() => selectedDoc && setConfirmDelete(selectedDoc)}
                  >
                    Eliminar
                  </button>
                </div>
            </div>
          </aside>
        ) : null}
      </div>

      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="¿Eliminar documento?"
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
                await handleDelete(confirmDeleteFinal);
              }
              setConfirmDeleteFinal(null);
            }}
            className="px-4 py-2 bg-red-700 text-white rounded-lg"
          >
            Eliminar definitivamente
          </button>
        </div>
      </Modal>

      <Modal isOpen={uploadOpen} onClose={closeUpload} title="Subir Archivo">
        <div className="space-y-6">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
            className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-8 text-center"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[24px]">
                cloud_upload
              </span>
            </div>
            <p className="mt-4 text-sm font-semibold text-gray-900">
              Arrastra tus archivos aqui o haz clic para buscar
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Soporta PDF, JPG, PNG, DOCX, XLSX (Max. 50MB)
            </p>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[16px]">
                  shield
                </span>
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Privacidad del archivo
                </p>
                <p className="text-xs text-gray-500">
                  Determina quien puede ver estos documentos.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPrivacy("private")}
                className={cx(
                  "rounded-xl border px-4 py-2 text-xs font-semibold",
                  privacy === "private"
                    ? "border-primary bg-primary text-white"
                    : "border-gray-200 text-gray-600"
                )}
              >
                Privado
              </button>
              <button
                type="button"
                onClick={() => setPrivacy("public")}
                className={cx(
                  "rounded-xl border px-4 py-2 text-xs font-semibold",
                  privacy === "public"
                    ? "border-primary bg-primary text-white"
                    : "border-gray-200 text-gray-600"
                )}
              >
                Publico
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500">
              ARCHIVOS SELECCIONADOS ({pendingFiles.length})
            </p>
            {pendingFiles.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
                Aun no hay archivos seleccionados.
              </div>
            ) : (
              pendingFiles.map((file) => (
                <div
                  key={file.name}
                  className="rounded-2xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <FileIcon
                        type={getTypeFromName(file.name)}
                        className="text-[20px]"
                      />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatBytes(file.size)} - listo
                      </p>
                    </div>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <span className="material-symbols-outlined text-[16px]">
                        check
                      </span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeUpload}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={closeUpload}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow"
            >
              Finalizar Carga
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={permissionsOpen}
        onClose={() => setPermissionsOpen(false)}
        title="Gestionar permisos"
      >
        {!selectedDoc ? (
          <p className="text-sm text-gray-500">
            No hay un documento seleccionado.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">
                {selectedDoc.name}
              </p>
              <p className="text-xs text-gray-500">
                Acceso actual: {selectedDoc.security}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-gray-400">
                Personas con acceso
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(selectedDoc.access?.length
                  ? selectedDoc.access
                  : ["TU"]
                ).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleRemovePermission(item)}
                    className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600"
                    aria-label={`Quitar permiso a ${item}`}
                  >
                    {item}
                    <span className="material-symbols-outlined text-[12px]">
                      close
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Haz clic sobre un usuario para quitar acceso.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-gray-400">
                Agregar acceso
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  value={permissionDraft}
                  onChange={(e) => setPermissionDraft(e.target.value)}
                  placeholder="Nombre, iniciales o email"
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                />
                <button
                  type="button"
                  onClick={handleAddPermission}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow"
                >
                  Agregar
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPermissionsOpen(false)}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600"
              >
                Listo
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
