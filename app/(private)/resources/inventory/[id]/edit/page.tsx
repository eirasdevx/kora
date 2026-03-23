"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AssigneeSelect from "@/components/resources/AssigneeSelect";
import PageHeader from "@/components/shared/PageHeader";
import Modal from "@/components/Modal";
import { useInventoryStore } from "@/modules/resources/inventory.store";
import { InventoryItem, InventoryStatus } from "@/modules/resources/inventory.types";

const STATUS_OPTIONS: Array<{ value: InventoryStatus; label: string }> = [
  { value: "available", label: "Disponible" },
  { value: "in_use", label: "En uso" },
  { value: "maintenance", label: "En mantenimiento" },
  { value: "retired", label: "Retirado" },
];

const CATEGORY_OPTIONS = [
  "Hardware / TI",
  "Audiovisual",
  "Mobiliario",
  "Logística",
  "Material educativo",
  "Documentación",
];

type AssetFormState = {
  name: string;
  serial: string;
  category: string;
  status: InventoryStatus;
  location: string;
  assignee: string;
  acquisitionDate: string;
  value: string;
  notes: string;
  photoUrl?: string;
};

const initialState: AssetFormState = {
  name: "",
  serial: "",
  category: "",
  status: "available",
  location: "",
  assignee: "",
  acquisitionDate: "",
  value: "",
  notes: "",
  photoUrl: undefined,
};

export default function InventoryEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { items, loadItems, upsertItem, removeItem } = useInventoryStore();
  const [form, setForm] = useState<AssetFormState>(initialState);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteFinal, setConfirmDeleteFinal] = useState(false);

  useEffect(() => {
    loadItems()
      .finally(() => setHasLoaded(true))
      .catch(() => setHasLoaded(true));
  }, [loadItems]);

  const item = useMemo(
    () => items.find((entry) => entry.id === params.id),
    [items, params.id]
  );

  useEffect(() => {
    if (!item) return;
    setForm({
      name: item.name ?? "",
      serial: item.serial ?? "",
      category: item.category ?? "",
      status: item.status ?? (item.borrowed > 0 ? "in_use" : "available"),
      location: item.location ?? "",
      assignee: item.assignee ?? "",
      acquisitionDate: item.acquisitionDate ?? "",
      value: item.value ? String(item.value) : "",
      notes: item.notes ?? "",
      photoUrl: item.photoUrl ?? undefined,
    });
  }, [item]);

  const canSave = useMemo(
    () => form.name.trim().length > 0 && form.category.trim().length > 0,
    [form.category, form.name]
  );

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen supera el máximo de 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        photoUrl: typeof reader.result === "string" ? reader.result : undefined,
      }));
      setPhotoName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!item) {
      setError("No se encontró el activo a editar.");
      return;
    }

    if (!canSave) {
      setError("Completa el nombre y la categoría para guardar el activo.");
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const quantity = item.quantity ?? 1;
      const borrowedBase = item.borrowed ?? 0;
      const borrowed =
        form.status === "in_use"
          ? Math.max(1, borrowedBase)
          : 0;
      const valueNumber = Number.parseFloat(form.value.replace(",", "."));
      const updatedItem: InventoryItem = {
        ...item,
        name: form.name.trim(),
        serial: form.serial.trim() || undefined,
        category: form.category,
        status: form.status,
        quantity,
        borrowed: Math.min(borrowed, quantity),
        location: form.location.trim() || undefined,
        assignee: form.assignee.trim() || undefined,
        acquisitionDate: form.acquisitionDate || undefined,
        value: Number.isFinite(valueNumber) ? valueNumber : undefined,
        notes: form.notes.trim() || undefined,
        photoUrl: form.photoUrl,
        updatedAt: now,
      };

      await upsertItem(updatedItem);
      router.push("/resources/inventory");
    } catch {
      setError("No se pudo guardar el activo. Inténtalo de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!item) return;
    setConfirmDelete(true);
  };

  if (!hasLoaded) {
    return (
      <div className="space-y-6 lg:space-y-8">
        <PageHeader
          title="Editar activo"
          subtitle="Panel de inventario"
          backHref="/resources/inventory"
          backLabel="Volver a Inventario"
        />
        <div className="rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
          Cargando activo...
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-6 lg:space-y-8">
        <PageHeader
          title="Editar activo"
          subtitle="Panel de inventario"
          backHref="/resources/inventory"
          backLabel="Volver a Inventario"
        />
        <div className="rounded-3xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
          No se encontró el activo solicitado.
          <div className="mt-4">
            <Link
              href="/resources/inventory"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 hover:border-primary/40 hover:text-primary"
            >
              Volver al inventario
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Editar activo"
        subtitle="Panel de inventario"
        backHref="/resources/inventory"
        backLabel="Volver a Inventario"
        actions={
          <>
            <Link
              href="/resources/inventory"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-primary/40 hover:text-primary"
            >
              Cancelar
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm transition hover:border-rose-300 hover:bg-rose-50"
            >
              Eliminar
            </button>
            <button
              type="submit"
              form="asset-form"
              disabled={!canSave || isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
            >
              Guardar cambios
            </button>
          </>
        }
      />

      <form id="asset-form" onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-gray-600">
                Actualización
              </span>
              <h2 className="text-2xl font-semibold text-gray-900">
                Editar información del activo
              </h2>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Actualiza los datos del activo para mantener el inventario
              al día.
            </p>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="mt-8 space-y-8">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    info
                  </span>
                  1. Información general
                </div>
                <div className="mt-4 grid gap-4">
                  <label className="space-y-2 text-sm font-semibold text-gray-700">
                    Nombre del activo
                    <input
                      value={form.name}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Ej. MacBook Pro 16 M3 Max"
                      className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-normal text-gray-700 shadow-sm focus:border-primary focus:outline-none"
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm font-semibold text-gray-700">
                      Número de serie / ID
                      <input
                        value={form.serial}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            serial: event.target.value,
                          }))
                        }
                        placeholder="SN-82736415"
                        className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-normal text-gray-700 shadow-sm focus:border-primary focus:outline-none"
                      />
                    </label>
                    <label className="space-y-2 text-sm font-semibold text-gray-700">
                      Categoría
                      <select
                        value={form.category}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            category: event.target.value,
                          }))
                        }
                        className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-normal text-gray-700 shadow-sm focus:border-primary focus:outline-none"
                      >
                        <option value="">Selecciona una categoría</option>
                        {CATEGORY_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    location_on
                  </span>
                  2. Estado y ubicación
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-semibold text-gray-700">
                    Estado inicial
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          status: event.target.value as InventoryStatus,
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-normal text-gray-700 shadow-sm focus:border-primary focus:outline-none"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-semibold text-gray-700">
                    Ubicación física
                    <input
                      value={form.location}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          location: event.target.value,
                        }))
                      }
                      placeholder="Oficina Central - Planta 3"
                      className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-normal text-gray-700 shadow-sm focus:border-primary focus:outline-none"
                    />
                  </label>
                </div>
                <label className="mt-4 block space-y-2 text-sm font-semibold text-gray-700">
                  Responsable asignado
                  <AssigneeSelect
                    value={form.assignee}
                    onChange={(assignee) =>
                      setForm((prev) => ({
                        ...prev,
                        assignee,
                      }))
                    }
                  />
                </label>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    description
                  </span>
                  3. Detalles adicionales
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-semibold text-gray-700">
                    Fecha de adquisición
                    <input
                      type="date"
                      value={form.acquisitionDate}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          acquisitionDate: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-normal text-gray-700 shadow-sm focus:border-primary focus:outline-none"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-semibold text-gray-700">
                    Valor estimado (EUR)
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                        €
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.value}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            value: event.target.value,
                          }))
                        }
                        placeholder="0.00"
                        className="mt-2 w-full rounded-2xl border border-gray-200 py-3 pl-8 pr-4 text-sm font-normal text-gray-700 shadow-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                  </label>
                </div>
                <label className="mt-4 block space-y-2 text-sm font-semibold text-gray-700">
                  Notas / Descripción
                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="Añade detalles relevantes sobre el estado o especificaciones..."
                    className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-normal text-gray-700 shadow-sm focus:border-primary focus:outline-none"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-800">
                Fotografía del activo
              </p>
              <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-xs font-semibold text-gray-500">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(event) =>
                    handleFileChange(event.target.files?.[0] ?? null)
                  }
                />
                {form.photoUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={form.photoUrl}
                      alt="Vista previa del activo"
                      className="h-24 w-24 rounded-2xl object-cover"
                    />
                    <span className="text-xs text-gray-500">
                      {photoName ?? "Imagen cargada"}
                    </span>
                    <span className="text-xs font-semibold text-primary">
                      Cambiar foto
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[26px] text-primary">
                      photo_camera
                    </span>
                    Click para subir foto
                    <span className="text-[11px] font-normal text-gray-400">
                      o arrastra y suelta (PNG, JPG hasta 5MB)
                    </span>
                  </>
                )}
              </label>
              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                  <span className="material-symbols-outlined text-[18px]">
                    qr_code_2
                  </span>
                  QR automático
                </div>
                Se generará un código al guardar el activo.
              </div>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-blue-50 px-4 py-5 text-sm text-blue-700">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                <span className="material-symbols-outlined text-[18px]">
                  lightbulb
                </span>
                Consejo Kora
              </div>
              Asignar un responsable facilita el seguimiento de auditorías
              anuales y mantenimiento preventivo.
            </div>
          </div>
        </div>
      </form>

      <Modal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="¿Eliminar activo?"
      >
        <p className="mb-6">
          ¿Seguro que quieres eliminar{" "}
          <strong>{item?.name?.trim() || "este activo"}</strong>?
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmDelete(false)}
            className="px-4 py-2 border rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              setConfirmDeleteFinal(true);
              setConfirmDelete(false);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg"
          >
            Sí, eliminar
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={confirmDeleteFinal}
        onClose={() => setConfirmDeleteFinal(false)}
        title="Confirmación final"
      >
        <p className="mb-6 text-red-600 font-medium">
          Esta acción no se puede deshacer.
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmDeleteFinal(false)}
            className="px-4 py-2 border rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={async () => {
              if (item) {
                await removeItem(item.id);
              }
              setConfirmDeleteFinal(false);
              router.push("/resources/inventory");
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
