"use client";

import type { DragEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { useLocale } from "@/core/i18n/use-locale";
import { useSessionStore } from "@/core/session/session.store";
import { useUsersStore } from "@/core/users/users.store";
import type { AssociationDataMutationMode } from "@/lib/association-data";
import {
  parseMemberPointRewardsImport,
  type ParsedMemberPointRewardsImport,
} from "@/modules/people/member-points-import";
import { useMemberPointsStore } from "@/modules/people/member-points.store";
import {
  MemberPointRewardCategoryLabels,
  type MemberPointReward,
} from "@/modules/people/member-points.types";

const TOOLBAR_BUTTON_STYLES =
  "inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50";
const PRIMARY_BUTTON_STYLES =
  "inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-white shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/50";

const CSV_TEMPLATE = `title,description,category,pointsCost,stock,active,id
Descuento en cuota,Reduccion parcial de la siguiente cuota,discount,120,,true,reward-discount-fee
Pack de merchandising,Camiseta libreta y chapa,merchandise,180,20,true,reward-merch-pack
Pase prioritario para evento,Acceso prioritario a eventos,experience,90,15,true,reward-event-pass
`;

const JSON_TEMPLATE = JSON.stringify(
  {
    memberPointRewards: [
      {
        id: "reward-discount-fee",
        title: "Descuento en cuota",
        description: "Reduccion parcial de la siguiente cuota.",
        category: "discount",
        pointsCost: 120,
        active: true,
      },
      {
        id: "reward-merch-pack",
        title: "Pack de merchandising",
        description: "Camiseta, libreta y chapa de la asociaci?n.",
        category: "merchandise",
        pointsCost: 180,
        stock: 20,
        active: true,
      },
    ],
  },
  null,
  2
);

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const decimals = size >= 10 || unitIndex === 0 ? 0 : 1;
  return `${size.toFixed(decimals)} ${units[unitIndex]}`;
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getPreviewRows(rewards: MemberPointReward[]) {
  return rewards.slice(0, 8);
}

export default function MemberRewardsImportPage() {
  const { formatLocale } = useLocale();
  const activeUserId = useSessionStore((state) => state.activeUserId);
  const users = useUsersStore((state) => state.users);
  const rewards = useMemberPointsStore((state) => state.rewards);
  const importRewards = useMemberPointsStore((state) => state.importRewards);
  const hasLoadedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedImport, setParsedImport] =
    useState<ParsedMemberPointRewardsImport | null>(null);
  const [importMode, setImportMode] =
    useState<AssociationDataMutationMode>("merge");
  const [busy, setBusy] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeUser = useMemo(
    () => users.find((user) => user.id === activeUserId) ?? null,
    [activeUserId, users]
  );
  const canManageMarketplace =
    activeUser?.role === "Admin" || activeUser?.role === "Gestor";

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    void useMemberPointsStore.getState().loadPointsData();
  }, []);

  const previewRows = useMemo(
    () => getPreviewRows(parsedImport?.rewards ?? []),
    [parsedImport]
  );
  const currentRewardIds = useMemo(
    () => new Set(rewards.map((reward) => reward.id)),
    [rewards]
  );
  const mergeSummary = useMemo(() => {
    let updates = 0;
    let creations = 0;

    for (const reward of parsedImport?.rewards ?? []) {
      if (currentRewardIds.has(reward.id)) {
        updates += 1;
      } else {
        creations += 1;
      }
    }

    return {
      updates,
      creations,
    };
  }, [currentRewardIds, parsedImport]);
  const warningCount = useMemo(
    () =>
      parsedImport?.issues.filter((issue) => issue.level === "warning").length ??
      0,
    [parsedImport]
  );
  const errorCount = useMemo(
    () =>
      parsedImport?.issues.filter((issue) => issue.level === "error").length ?? 0,
    [parsedImport]
  );
  const selectedFileSize = selectedFile ? formatBytes(selectedFile.size) : null;
  const activeRewardsCount = rewards.filter((reward) => reward.active).length;

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setParsedImport(null);
    setMessage(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const loadFile = async (file: File) => {
    setParsingFile(true);
    setSelectedFile(file);
    setMessage(null);
    setError(null);

    try {
      const parsed = parseMemberPointRewardsImport(await file.text(), file.name);
      setParsedImport(parsed);
    } catch (loadError) {
      setParsedImport(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo leer el archivo seleccionado."
      );
    } finally {
      setParsingFile(false);
    }
  };

  const handleFilesSelected = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    void loadFile(file);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    handleFilesSelected(event.dataTransfer.files);
  };

  const handleImport = async () => {
    if (!canManageMarketplace) {
      setError("Solo gestores y administradores pueden importar recompensas.");
      return;
    }

    if (!parsedImport || parsedImport.rewards.length === 0) {
      setError("Necesitas un archivo con al menos una recompensa valida.");
      return;
    }

    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const imported = await importRewards(parsedImport.rewards, importMode);
      setMessage(
        importMode === "replace"
          ? `Cat?logo reemplazado con ${formatNumber(imported.length, formatLocale)} recompensas.`
          : `Importaci?n completada: ${formatNumber(parsedImport.rewards.length, formatLocale)} recompensas procesadas, ${formatNumber(mergeSummary.creations, formatLocale)} nuevas y ${formatNumber(mergeSummary.updates, formatLocale)} actualizadas por id.`
      );
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "No se pudo completar la importacion."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Importar recompensas"
        subtitle="Carga un catalogo CSV o JSON para publicar nuevas recompensas o actualizar el marketplace de puntos de socios."
        backHref="/people/members/points"
        backLabel="Volver al marketplace"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                downloadTextFile(
                  "kora-member-rewards-template.csv",
                  CSV_TEMPLATE,
                  "text/csv;charset=utf-8"
                )
              }
              className={TOOLBAR_BUTTON_STYLES}
            >
              <span className="material-symbols-outlined text-[18px]">
                table_view
              </span>
              Plantilla CSV
            </button>
            <button
              type="button"
              onClick={() =>
                downloadTextFile(
                  "kora-member-rewards-example.json",
                  JSON_TEMPLATE,
                  "application/json;charset=utf-8"
                )
              }
              className={TOOLBAR_BUTTON_STYLES}
            >
              <span className="material-symbols-outlined text-[18px]">
                data_object
              </span>
              Ejemplo JSON
            </button>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Cat?logo actual
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatNumber(rewards.length, formatLocale)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {formatNumber(activeRewardsCount, formatLocale)} recompensas activas
          </p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Formatos
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">CSV / JSON</p>
          <p className="mt-1 text-sm text-slate-500">
            Delimitador coma, punto y coma o JSON con lista de rewards
          </p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Modo actual
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {importMode === "merge" ? "Combinar" : "Reemplazar"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {importMode === "merge"
              ? "Actualiza por id y mantiene el resto del catalogo."
              : "Sustituye el catalogo completo de recompensas."}
          </p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Archivo listo
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {parsedImport ? formatNumber(parsedImport.rewards.length, formatLocale) : "0"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Recompensas validas detectadas
          </p>
        </article>
      </section>

      {!canManageMarketplace ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 shadow-sm">
          Solo los usuarios con rol de gestor o administrador pueden subir o
          reemplazar recompensas del marketplace.
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_360px]">
        <article className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_42%),linear-gradient(180deg,#ffffff,rgba(248,250,252,0.96))] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  <span className="material-symbols-outlined text-[22px]">
                    upload_file
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Entrada de catalogo
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">
                    Cargar archivo
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    El archivo puede ser un CSV con cabeceras o un JSON con la
                    lista de recompensas.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                Marketplace de socios
              </span>
            </div>
          </div>

          <div className="space-y-6 p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setImportMode("merge")}
                className={cx(
                  "rounded-2xl border px-4 py-4 text-left transition",
                  importMode === "merge"
                    ? "border-emerald-300 bg-emerald-50/80 text-emerald-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                )}
              >
                <p className="text-sm font-semibold">Combinar</p>
                <p className="mt-1 text-xs leading-5 text-inherit/80">
                  Mantiene el catalogo actual y actualiza las recompensas que
                  coinciden por id.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setImportMode("replace")}
                className={cx(
                  "rounded-2xl border px-4 py-4 text-left transition",
                  importMode === "replace"
                    ? "border-rose-300 bg-rose-50/80 text-rose-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                )}
              >
                <p className="text-sm font-semibold">Reemplazar catalogo</p>
                <p className="mt-1 text-xs leading-5 text-inherit/80">
                  Borra el catalogo actual y carga solo las recompensas del
                  archivo. El historico de canjes se conserva.
                </p>
              </button>
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cx(
                "rounded-[28px] border-2 border-dashed px-6 py-10 text-center transition",
                isDragActive
                  ? "border-primary bg-primary/10"
                  : "border-slate-200 bg-slate-50/70"
              )}
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                <span className="material-symbols-outlined text-[24px]">
                  cloud_upload
                </span>
              </div>
              <p className="mt-5 text-base font-semibold text-slate-900">
                Arrastra un CSV o JSON para previsualizarlo
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Tambien puedes elegir el archivo manualmente. Se validara antes
                de importar.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={TOOLBAR_BUTTON_STYLES}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    upload
                  </span>
                  Elegir archivo
                </button>
                {selectedFile ? (
                  <button
                    type="button"
                    onClick={clearSelectedFile}
                    className={TOOLBAR_BUTTON_STYLES}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      close
                    </span>
                    Quitar archivo
                  </button>
                ) : null}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,text/csv,application/json"
                className="sr-only"
                onChange={(event) => handleFilesSelected(event.target.files)}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Vista previa
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Se muestran las primeras recompensas validas detectadas.
                    </p>
                  </div>
                  {parsedImport ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {parsedImport.format.toUpperCase()}
                    </span>
                  ) : null}
                </div>

                {parsingFile ? (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                    Analizando archivo...
                  </div>
                ) : previewRows.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                    Todav?a no hay recompensas para previsualizar.
                  </div>
                ) : (
                  <div className="mt-5 overflow-x-auto">
                    <table className="min-w-[720px] w-full text-left text-sm">
                      <thead className="border-y border-slate-100 bg-slate-50/90 text-[11px] uppercase tracking-[0.12em] text-slate-400">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Recompensa</th>
                          <th className="px-4 py-3 font-semibold">Categoria</th>
                          <th className="px-4 py-3 font-semibold text-right">
                            Puntos
                          </th>
                          <th className="px-4 py-3 font-semibold text-right">
                            Stock
                          </th>
                          <th className="px-4 py-3 font-semibold">Estado</th>
                          <th className="px-4 py-3 font-semibold">ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {previewRows.map((reward) => (
                          <tr key={reward.id} className="hover:bg-slate-50/70">
                            <td className="px-4 py-4">
                              <div className="font-semibold text-slate-900">
                                {reward.title}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {reward.description || "Sin descripcion"}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                              {MemberPointRewardCategoryLabels[reward.category]}
                            </td>
                            <td className="px-4 py-4 text-right font-semibold text-slate-900">
                              {formatNumber(reward.pointsCost, formatLocale)} pts
                            </td>
                            <td className="px-4 py-4 text-right text-slate-600">
                              {typeof reward.stock === "number"
                                ? formatNumber(reward.stock, formatLocale)
                                : "Ilimitado"}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={cx(
                                  "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                                  reward.active
                                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100"
                                    : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200"
                                )}
                              >
                                {reward.active ? "Activa" : "Inactiva"}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-xs text-slate-500">
                              {reward.id}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <aside className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Resumen de importacion
                </p>

                {selectedFile ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {selectedFile.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedFileSize} {parsedImport ? "- archivo listo" : ""}
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                    No has seleccionado ningun archivo.
                  </div>
                )}

                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Recompensas validas
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {formatNumber(parsedImport?.rewards.length ?? 0, formatLocale)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Avisos y errores
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      {formatNumber(warningCount, formatLocale)} avisos y{" "}
                      {formatNumber(errorCount, formatLocale)} errores
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Impacto estimado
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      {importMode === "replace"
                        ? `El catalogo quedara con ${formatNumber(parsedImport?.rewards.length ?? 0, formatLocale)} recompensas.`
                        : `${formatNumber(mergeSummary.creations, formatLocale)} nuevas y ${formatNumber(mergeSummary.updates, formatLocale)} actualizadas por id.`}
                    </p>
                  </div>
                </div>

                <div
                  className={cx(
                    "mt-4 rounded-2xl border px-4 py-3 text-xs leading-5",
                    importMode === "replace"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  )}
                >
                  {importMode === "replace"
                    ? "Atencion: las recompensas actuales se eliminaran antes de guardar el nuevo catalogo."
                    : "Consejo: incluye la columna id si quieres actualizar recompensas existentes sin duplicarlas."}
                </div>
              </aside>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Cabeceras detectadas:{" "}
                {parsedImport?.columns.length
                  ? parsedImport.columns.join(", ")
                  : "ninguna todav?a"}
              </p>
              <button
                type="button"
                onClick={() => void handleImport()}
                disabled={
                  busy ||
                  parsingFile ||
                  !parsedImport ||
                  parsedImport.rewards.length === 0 ||
                  !canManageMarketplace
                }
                className={PRIMARY_BUTTON_STYLES}
              >
                <span className="material-symbols-outlined text-[18px]">
                  publish
                </span>
                {busy ? "Importando..." : "Importar recompensas"}
              </button>
            </div>

            {message ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {message}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {error}
              </div>
            ) : null}
          </div>
        </article>

        <aside className="space-y-6">
          <article className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Campos recomendados
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">
                  Obligatorios
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  `title` y `pointsCost`
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">
                  Opcionales
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  `id`, `description`, `category`, `stock`, `active`,
                  `createdAt`, `updatedAt`
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Reglas del importador
            </p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>
                Si no incluyes `id`, Kora genera uno a partir del titulo y la
                categoria.
              </p>
              <p>
                Las categorias aceptadas son `benefit`, `discount`,
                `merchandise` y `experience`.
              </p>
              <p>
                El stock vac?o se interpreta como ilimitado. El valor `0`
                mantiene la recompensa sin unidades disponibles.
              </p>
            </div>
          </article>

          <article className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Incidencias detectadas
            </p>
            {parsedImport?.issues.length ? (
              <div className="mt-4 space-y-3">
                {parsedImport.issues.slice(0, 8).map((issue, index) => (
                  <div
                    key={`${issue.level}-${issue.row ?? "global"}-${index}`}
                    className={cx(
                      "rounded-2xl border px-4 py-3 text-sm",
                      issue.level === "error"
                        ? "border-rose-200 bg-rose-50 text-rose-800"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    )}
                  >
                    <p className="font-semibold">
                      {issue.level === "error" ? "Error" : "Aviso"}
                      {typeof issue.row === "number" ? ` - fila ${issue.row}` : ""}
                    </p>
                    <p className="mt-1">{issue.message}</p>
                  </div>
                ))}
                {parsedImport.issues.length > 8 ? (
                  <p className="text-xs text-slate-500">
                    Se muestran 8 incidencias de{" "}
                    {formatNumber(parsedImport.issues.length, formatLocale)}.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                Cuando cargues un archivo veras aqui los avisos y errores de
                validacion.
              </div>
            )}
          </article>
        </aside>
      </section>
    </div>
  );
}
