"use client";

import { useMemo, useState } from "react";
import SettingsPageHeader from "@/components/shared/SettingsPageHeader";
import Icon from "@/components/shared/Icon";
import type { SessionBootstrapPayload } from "@/core/session/session-payload";
import {
  MEMBERS_APP_FEATURE_LABELS,
  type MembersAppFeatureKey,
  type MembersAppProfileField,
  normalizeMembersAppSettings,
} from "@/core/session/members-app-settings";
import { useSessionStore } from "@/core/session/session.store";
import { useUsersStore } from "@/core/users/users.store";
import {
  applySessionPayload,
  parseApiResponse,
} from "@/lib/client/session-client";

type FormState = ReturnType<typeof normalizeMembersAppSettings>;

const control =
  "mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10";

const featureDescriptions: Record<MembersAppFeatureKey, string> = {
  dashboard: "Resumen de avisos, eventos y estado personal.",
  profile: "Ficha personal del socio.",
  membershipStatus: "Estado, alta y tipo de membresia.",
  events: "Listado de eventos visibles para miembros.",
  eventAttendance: "Acciones para confirmar o cancelar asistencia.",
  documents: "Biblioteca de documentos permitidos.",
  notifications: "Centro de avisos dentro de la app.",
  groups: "Grupos o comisiones a los que pertenece.",
  directory: "Listado publico limitado, si la asociacion lo permite.",
};

function normalize(value: string) {
  return value.trim();
}

function serializeSettings(settings: FormState) {
  const { updatedAt: _updatedAt, ...stableSettings } = settings;
  return JSON.stringify(stableSettings);
}

function FieldToggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
      />
      {label}
    </label>
  );
}

export default function MembersAppSettingsPage() {
  const association = useSessionStore((state) => state.association);
  const activeUserId = useSessionStore((state) => state.activeUserId);
  const users = useUsersStore((state) => state.users);
  const activeUser = users.find((user) => user.id === activeUserId) ?? null;
  const canEdit = activeUser?.role === "Admin";

  const initialSettings = useMemo(
    () => normalizeMembersAppSettings(association?.membersAppSettings),
    [association?.membersAppSettings]
  );
  const [form, setForm] = useState<FormState>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasChanges =
    serializeSettings(form) !== serializeSettings(initialSettings);
  const enabledFields = form.profileFields.filter((field) => field.enabled).length;
  const editableFields = form.profileFields.filter(
    (field) => field.enabled && field.editable
  ).length;
  const enabledFeatures = Object.values(form.features).filter(Boolean).length;

  const updateField = (
    key: MembersAppProfileField["key"],
    patch: Partial<MembersAppProfileField>
  ) => {
    setForm((current) => ({
      ...current,
      profileFields: current.profileFields.map((field) =>
        field.key === key
          ? {
              ...field,
              ...patch,
              editable:
                patch.enabled === false
                  ? false
                  : patch.editable ?? field.editable,
              required:
                patch.enabled === false
                  ? false
                  : patch.required ?? field.required,
            }
          : field
      ),
    }));
  };

  const saveSettings = async () => {
    if (!canEdit || saving || !normalize(form.memberPortalName)) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/association", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          membersAppSettings: {
            ...form,
            memberPortalName: normalize(form.memberPortalName),
          },
        }),
      });

      const session = await parseApiResponse<SessionBootstrapPayload>(response);
      applySessionPayload(session);
      setLastSavedAt(Date.now());
    } catch (saveError) {
      console.error(saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar la configuracion de Kora Members."
      );
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    return (
      <div className="space-y-8">
        <SettingsPageHeader
          title="Kora Members"
          subtitle="Solo los administradores pueden configurar los datos disponibles para la app de miembros."
        />
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
          No tienes permisos para modificar esta configuracion.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SettingsPageHeader
        title="Kora Members"
        subtitle="Define que datos propios y secciones podran usar los socios en la app de miembros."
        actions={
          <button
            type="button"
            onClick={saveSettings}
            disabled={!hasChanges || saving || !normalize(form.memberPortalName)}
            className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        }
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.3fr]">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Estado del portal
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Esta configuracion no crea gestion para socios. Solo prepara la
            informacion que podra consumir Kora Members.
          </p>
        </div>
        <div className="space-y-5">
          <label className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <span>
              <span className="block text-sm font-semibold text-gray-900">
                Habilitar configuracion para Kora Members
              </span>
              <span className="mt-1 block text-xs text-gray-500">
                Permite guardar las reglas que leera la app de miembros.
              </span>
            </span>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  enabled: event.target.checked,
                }))
              }
              className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary/20"
            />
          </label>

          <div>
            <label className="text-sm font-semibold text-gray-700">
              Nombre visible de la app de miembros
            </label>
            <input
              value={form.memberPortalName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  memberPortalName: event.target.value,
                }))
              }
              className={control}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Campos visibles
              </p>
              <p className="mt-2 text-xl font-semibold text-gray-900">
                {enabledFields}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Editables
              </p>
              <p className="mt-2 text-xl font-semibold text-gray-900">
                {editableFields}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Secciones
              </p>
              <p className="mt-2 text-xl font-semibold text-gray-900">
                {enabledFeatures}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.3fr]">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Datos del socio
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Marca que datos podra ver el socio y cuales podra actualizar desde
            Kora Members.
          </p>
        </div>
        <div className="space-y-3">
          {form.profileFields.map((field) => (
            <div
              key={field.key}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {field.label}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Clave tecnica: {field.key}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <FieldToggle
                    label="Visible"
                    checked={field.enabled}
                    onChange={(checked) =>
                      updateField(field.key, { enabled: checked })
                    }
                  />
                  <FieldToggle
                    label="Editable"
                    checked={field.editable}
                    disabled={!field.enabled}
                    onChange={(checked) =>
                      updateField(field.key, { editable: checked })
                    }
                  />
                  <FieldToggle
                    label="Obligatorio"
                    checked={field.required}
                    disabled={!field.enabled}
                    onChange={(checked) =>
                      updateField(field.key, { required: checked })
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.3fr]">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Secciones disponibles
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Kora Members sera solo de consulta y autoservicio. Estas opciones
            controlan que pantallas podra mostrar.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {(Object.keys(form.features) as MembersAppFeatureKey[]).map((key) => (
            <label
              key={key}
              className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4"
            >
              <input
                type="checkbox"
                checked={form.features[key]}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    features: {
                      ...current.features,
                      [key]: event.target.checked,
                    },
                  }))
                }
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20"
              />
              <span>
                <span className="block text-sm font-semibold text-gray-900">
                  {MEMBERS_APP_FEATURE_LABELS[key]}
                </span>
                <span className="mt-1 block text-xs text-gray-500">
                  {featureDescriptions[key]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="grid gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.3fr]">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Privacidad y revision
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Define reglas basicas para cambios hechos por socios en su propio
            perfil.
          </p>
        </div>
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <span>
              <span className="block text-sm font-semibold text-gray-900">
                Permitir descarga de datos propios
              </span>
              <span className="mt-1 block text-xs text-gray-500">
                El socio podra pedir una copia de su informacion personal.
              </span>
            </span>
            <input
              type="checkbox"
              checked={form.allowMemberDataDownload}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  allowMemberDataDownload: event.target.checked,
                }))
              }
              className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary/20"
            />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <span>
              <span className="block text-sm font-semibold text-gray-900">
                Revisar cambios de perfil
              </span>
              <span className="mt-1 block text-xs text-gray-500">
                Los cambios editables quedan marcados para revision interna.
              </span>
            </span>
            <input
              type="checkbox"
              checked={form.requireProfileReview}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  requireProfileReview: event.target.checked,
                }))
              }
              className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary/20"
            />
          </label>
        </div>
      </section>

      <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white px-6 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Icon
            name={hasChanges ? "edit" : "check_circle"}
            className="text-[18px]"
          />
          {hasChanges
            ? "Hay cambios pendientes de guardar"
            : lastSavedAt
              ? "Configuracion guardada"
              : "Sin cambios pendientes"}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setForm(initialSettings)}
            disabled={!hasChanges || saving}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={saveSettings}
            disabled={!hasChanges || saving || !normalize(form.memberPortalName)}
            className="rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
