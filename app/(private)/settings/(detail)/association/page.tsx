"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import SettingsPageHeader from "@/components/shared/SettingsPageHeader";
import type { SessionBootstrapPayload } from "@/core/session/session-payload";
import {
  createEmptyMembershipPlan,
  getAssociationMembershipSettings,
  getDefaultMembershipPlan,
  getMembershipExecutionLabel,
  getMonthMaxDay,
  getNextMembershipChargeDate,
  normalizeAssociationMembershipSettings,
  type MembershipBillingCycle,
  type MembershipFeePlan,
} from "@/core/session/membership-settings";
import {
  type AssociationRepresentative,
  useSessionStore,
} from "@/core/session/session.store";
import { useUsersStore } from "@/core/users/users.store";
import {
  applySessionPayload,
  clearClientSession,
  parseApiResponse,
} from "@/lib/client/session-client";

type MembershipPlanFormState = {
  id: string;
  name: string;
  cycle: MembershipBillingCycle;
  amount: string;
  monthlyChargeDay: string;
  annualChargeMonth: string;
  annualChargeDay: string;
  description: string;
  benefits: string;
};

type ProfileFormState = {
  name: string;
  logoUrl: string;
  taxId: string;
  phone: string;
  contactEmail: string;
  location: string;
  address: string;
  membershipPlans: MembershipPlanFormState[];
  defaultMembershipPlanId: string;
  representatives: AssociationRepresentative[];
};

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const control =
  "mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10";

function normalize(value: string) {
  return value.trim();
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

function createRepresentativeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createRepresentative(): AssociationRepresentative {
  return { id: createRepresentativeId(), role: "", name: "", email: "", phone: "" };
}

function createPlanFormState(plan?: MembershipFeePlan): MembershipPlanFormState {
  const source = plan ?? createEmptyMembershipPlan();
  return {
    id: source.id,
    name: source.name,
    cycle: source.cycle,
    amount: String(source.amount),
    monthlyChargeDay: String(source.monthlyChargeDay),
    annualChargeMonth: String(source.annualChargeMonth),
    annualChargeDay: String(source.annualChargeDay),
    description: source.description ?? "",
    benefits: source.benefits ?? "",
  };
}

function getSettingsFromForm(form: ProfileFormState) {
  return normalizeAssociationMembershipSettings({
    plans: form.membershipPlans.map((plan) => ({
      id: plan.id,
      name: normalize(plan.name),
      cycle: plan.cycle,
      amount: plan.amount,
      monthlyChargeDay: plan.monthlyChargeDay,
      annualChargeMonth: plan.annualChargeMonth,
      annualChargeDay: plan.annualChargeDay,
      description: normalize(plan.description) || undefined,
      benefits: normalize(plan.benefits) || undefined,
    })),
    defaultPlanId: form.defaultMembershipPlanId,
  });
}

function getInitialState(
  association: ReturnType<typeof useSessionStore.getState>["association"]
): ProfileFormState {
  const settings = getAssociationMembershipSettings(association);
  return {
    name: association?.name ?? "",
    logoUrl: association?.logoUrl ?? "",
    taxId: association?.taxId ?? "",
    phone: association?.phone ?? "",
    contactEmail: association?.contactEmail ?? "",
    location: association?.location ?? "",
    address: association?.address ?? "",
    membershipPlans: settings.plans.map((plan) => createPlanFormState(plan)),
    defaultMembershipPlanId: getDefaultMembershipPlan(settings).id,
    representatives:
      association?.representatives?.map((rep) => ({
        id: rep.id || createRepresentativeId(),
        role: rep.role ?? "",
        name: rep.name ?? "",
        email: rep.email ?? "",
        phone: rep.phone ?? "",
      })) ?? [],
  };
}

function serializeForm(form: ProfileFormState) {
  return JSON.stringify({
    name: normalize(form.name),
    logoUrl: normalize(form.logoUrl),
    taxId: normalize(form.taxId),
    phone: normalize(form.phone),
    contactEmail: normalize(form.contactEmail),
    location: normalize(form.location),
    address: normalize(form.address),
    membershipSettings: getSettingsFromForm(form),
    representatives: form.representatives
      .map((rep) => ({
        id: rep.id,
        role: normalize(rep.role),
        name: normalize(rep.name),
        email: normalize(rep.email ?? ""),
        phone: normalize(rep.phone ?? ""),
      }))
      .filter((rep) => rep.role || rep.name || rep.email || rep.phone),
  });
}

export default function AssociationProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hydrated = useSessionStore((s) => s.hydrated);
  const association = useSessionStore((s) => s.association);
  const companyCode = useSessionStore((s) => s.companyCode);
  const activeAssociationId = useSessionStore((s) => s.activeAssociationId);
  const activeUserId = useSessionStore((s) => s.activeUserId);
  const users = useUsersStore((s) => s.users);
  const activeUser = users.find((user) => user.id === activeUserId) ?? null;
  const canEditAssociation = activeUser?.role === "Admin";
  const initialForm = useMemo(() => getInitialState(association), [association]);
  const [form, setForm] = useState(initialForm);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteFinal, setConfirmDeleteFinal] = useState(false);

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  const membershipPreview = useMemo(() => {
    const settings = getSettingsFromForm(form);
    const defaultPlan = getDefaultMembershipPlan(settings);
    return {
      settings,
      defaultPlan,
      nextCharge: getNextMembershipChargeDate(defaultPlan).toLocaleDateString("es-ES"),
    };
  }, [form]);

  const hasChanges = serializeForm(form) !== serializeForm(initialForm);

  if (!hydrated) {
    return <div className="min-h-screen bg-background-light" aria-busy="true" />;
  }

  if (!canEditAssociation) {
    return (
      <div className="space-y-8">
        <SettingsPageHeader
          section="Perfil de la asociación"
          title="Perfil de la asociación"
          subtitle="Solo los administradores pueden editar esta página."
        />
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
          No tienes permisos para modificar la configuración de la empresa.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SettingsPageHeader
        section="Perfil de la asociación"
        title="Perfil de la asociación"
        subtitle="Configura datos generales y varios tipos de cuota para tus socios."
        actions={
          <button
            type="button"
            onClick={() => document.getElementById("association-save")?.click()}
            className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow"
          >
            Guardar cambios
          </button>
        }
      />
      <section className="grid gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Información general</h2>
          <p className="mt-2 text-sm text-gray-500">
            Datos legales, contacto y logo de la asociación.
          </p>
        </div>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[120px_1fr]">
            <label className="flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-center text-xs text-gray-500 hover:border-primary/40">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const result = reader.result;
                    if (typeof result === "string") {
                      setForm((prev) => ({ ...prev, logoUrl: result }));
                    }
                  };
                  reader.readAsDataURL(file);
                }}
              />
              {form.logoUrl ? (
                <img
                  src={form.logoUrl}
                  alt={form.name || "Logo asociación"}
                  className="h-20 w-20 rounded-2xl object-contain"
                />
              ) : (
                <span>Subir logo</span>
              )}
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">Código</label>
                <input
                  value={companyCode ?? "No disponible"}
                  readOnly
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">Nombre</label>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className={control}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">NIF / CIF</label>
                <input
                  value={form.taxId}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, taxId: event.target.value }))
                  }
                  className={control}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Teléfono</label>
                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  className={control}
                />
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-gray-700">Correo de contacto</label>
              <input
                value={form.contactEmail}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, contactEmail: event.target.value }))
                }
                className={control}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Ciudad / Provincia</label>
              <input
                value={form.location}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, location: event.target.value }))
                }
                className={control}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">Dirección social</label>
              <textarea
                value={form.address}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, address: event.target.value }))
                }
                className={`${control} min-h-[100px]`}
              />
            </div>
          </div>
        </div>
      </section>
      <section className="grid gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Catálogo de cuotas</h2>
          <p className="mt-2 text-sm text-gray-500">
            Aquí defines todos los tipos de cuota de la asociación: menores, premium,
            becadas, familiares, anuales o cualquier otra casuística.
          </p>
          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-700">
            Estos planes se reutilizan automáticamente al crear socios, al generar
            cuotas y al registrar movimientos contables.
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Plan por defecto: {membershipPreview.defaultPlan.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatCurrency(membershipPreview.defaultPlan.amount)} ·{" "}
                {getMembershipExecutionLabel(membershipPreview.defaultPlan)} · Próximo cobro{" "}
                {membershipPreview.nextCharge}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  membershipPlans: [
                    ...prev.membershipPlans,
                    createPlanFormState(
                      createEmptyMembershipPlan({
                        name: `Plan ${prev.membershipPlans.length + 1}`,
                      })
                    ),
                  ],
                }))
              }
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-100"
            >
              Añadir plan
            </button>
          </div>

          {form.membershipPlans.map((plan, index) => {
            const annualMaxDay = getMonthMaxDay(Number(plan.annualChargeMonth || "1"));
            const preview = normalizeAssociationMembershipSettings({
              plans: [{ ...plan, name: normalize(plan.name) || `Plan ${index + 1}` }],
              defaultPlanId: plan.id,
            }).plans[0];
            const isDefault = form.defaultMembershipPlanId === plan.id;

            return (
              <div key={plan.id} className="rounded-3xl border border-gray-200 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-gray-900">
                      {normalize(plan.name) || `Plan ${index + 1}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {preview.cycle} · Próximo cobro{" "}
                      {getNextMembershipChargeDate(preview).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, defaultMembershipPlanId: plan.id }))
                      }
                      className={`rounded-xl px-4 py-2 text-xs font-semibold ${
                        isDefault
                          ? "bg-primary text-white"
                          : "border border-gray-200 bg-white text-gray-600"
                      }`}
                    >
                      {isDefault ? "Predeterminado" : "Usar por defecto"}
                    </button>
                    <button
                      type="button"
                      disabled={form.membershipPlans.length === 1}
                      onClick={() =>
                        setForm((prev) => {
                          if (prev.membershipPlans.length === 1) return prev;
                          const membershipPlans = prev.membershipPlans.filter(
                            (item) => item.id !== plan.id
                          );
                          return {
                            ...prev,
                            membershipPlans,
                            defaultMembershipPlanId:
                              prev.defaultMembershipPlanId === plan.id
                                ? membershipPlans[0]?.id ?? ""
                                : prev.defaultMembershipPlanId,
                          };
                        })
                      }
                      className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Nombre</label>
                    <input
                      value={plan.name}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          membershipPlans: prev.membershipPlans.map((item) =>
                            item.id === plan.id ? { ...item, name: event.target.value } : item
                          ),
                        }))
                      }
                      className={control}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Importe</label>
                    <input
                      value={plan.amount}
                      type="number"
                      min="0"
                      step="0.01"
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          membershipPlans: prev.membershipPlans.map((item) =>
                            item.id === plan.id ? { ...item, amount: event.target.value } : item
                          ),
                        }))
                      }
                      className={control}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Periodicidad</label>
                    <select
                      value={plan.cycle}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          membershipPlans: prev.membershipPlans.map((item) =>
                            item.id === plan.id
                              ? { ...item, cycle: event.target.value as MembershipBillingCycle }
                              : item
                          ),
                        }))
                      }
                      className={control}
                    >
                      <option value="Mensual">Mensual</option>
                      <option value="Anual">Anual</option>
                    </select>
                  </div>
                </div>

                {plan.cycle === "Mensual" ? (
                  <div className="mt-4">
                    <label className="text-sm font-semibold text-gray-700">Día de cobro mensual</label>
                    <input
                      value={plan.monthlyChargeDay}
                      type="number"
                      min="1"
                      max="31"
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          membershipPlans: prev.membershipPlans.map((item) =>
                            item.id === plan.id
                              ? {
                                  ...item,
                                  monthlyChargeDay: String(
                                    Math.min(
                                      31,
                                      Math.max(1, Number(event.target.value || "1"))
                                    )
                                  ),
                                }
                              : item
                          ),
                        }))
                      }
                      className={control}
                    />
                    <p className="mt-2 text-xs text-gray-400">
                      Si eliges 29, 30 o 31, en los meses más cortos se cobrará
                      el último día disponible.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-semibold text-gray-700">Mes anual</label>
                      <select
                        value={plan.annualChargeMonth}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            membershipPlans: prev.membershipPlans.map((item) =>
                              item.id === plan.id
                                ? {
                                    ...item,
                                    annualChargeMonth: event.target.value,
                                    annualChargeDay: String(
                                      Math.min(
                                        Number(item.annualChargeDay || "1"),
                                        getMonthMaxDay(Number(event.target.value))
                                      )
                                    ),
                                  }
                                : item
                            ),
                          }))
                        }
                        className={control}
                      >
                        {MONTHS.map((month, monthIndex) => (
                          <option key={month} value={String(monthIndex + 1)}>
                            {month}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700">Día anual</label>
                      <input
                        value={plan.annualChargeDay}
                        type="number"
                        min="1"
                        max={String(annualMaxDay)}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            membershipPlans: prev.membershipPlans.map((item) =>
                              item.id === plan.id
                                ? {
                                    ...item,
                                    annualChargeDay: String(
                                      Math.min(
                                        annualMaxDay,
                                        Math.max(1, Number(event.target.value || "1"))
                                      )
                                    ),
                                  }
                                : item
                            ),
                          }))
                        }
                        className={control}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Condiciones</label>
                    <textarea
                      value={plan.description}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          membershipPlans: prev.membershipPlans.map((item) =>
                            item.id === plan.id
                              ? { ...item, description: event.target.value }
                              : item
                          ),
                        }))
                      }
                      className={`${control} min-h-[96px]`}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Beneficios / privilegios</label>
                    <textarea
                      value={plan.benefits}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          membershipPlans: prev.membershipPlans.map((item) =>
                            item.id === plan.id
                              ? { ...item, benefits: event.target.value }
                              : item
                          ),
                        }))
                      }
                      className={`${control} min-h-[96px]`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Planes activos
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-900">
                {form.membershipPlans.length}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Predeterminado
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-900">
                {membershipPreview.defaultPlan.name}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Próximo cobro base
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-900">
                {membershipPreview.nextCharge}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Representantes</h2>
          <p className="mt-2 text-sm text-gray-500">
            Junta directiva y cargos principales de la asociación.
          </p>
        </div>
        <div className="space-y-4">
          {form.representatives.map((rep, index) => (
            <div key={rep.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                  Representante {index + 1}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      representatives: prev.representatives.filter((item) => item.id !== rep.id),
                    }))
                  }
                  className="rounded-xl border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-500"
                >
                  Eliminar
                </button>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {(["role", "name", "email", "phone"] as const).map((field) => (
                  <input
                    key={field}
                    value={rep[field] ?? ""}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        representatives: prev.representatives.map((item) =>
                          item.id === rep.id ? { ...item, [field]: event.target.value } : item
                        ),
                      }))
                    }
                    placeholder={
                      field === "role"
                        ? "Cargo"
                        : field === "name"
                          ? "Nombre completo"
                          : field === "email"
                            ? "Correo"
                            : "Teléfono"
                    }
                    className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                ))}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                representatives: [...prev.representatives, createRepresentative()],
              }))
            }
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 shadow-sm hover:bg-gray-50"
          >
            Añadir representante
          </button>
        </div>
      </section>
      <section className="grid gap-6 rounded-3xl border border-rose-200 bg-rose-50/40 p-6 shadow-sm lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-lg font-semibold text-rose-700">Eliminar asociación</h2>
          <p className="mt-2 text-sm text-rose-600">
            Esta acción elimina la asociación activa y cierra tu sesión.
          </p>
        </div>
        <div className="flex items-center justify-start lg:justify-end">
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-2xl border border-rose-200 bg-white px-5 py-2.5 text-sm font-semibold text-rose-600 shadow-sm hover:bg-rose-100"
          >
            Eliminar asociación
          </button>
        </div>
      </section>

      <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white px-6 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-gray-500">
          {hasChanges
            ? "Hay cambios pendientes de guardar"
            : lastSavedAt
              ? "Cambios guardados"
              : "Sin cambios pendientes"}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setForm(initialForm)}
            disabled={!hasChanges}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            Descartar
          </button>
          <button
            id="association-save"
            type="button"
            onClick={() => {
              const representatives = form.representatives
                .map((rep) => ({
                  id: rep.id || createRepresentativeId(),
                  role: normalize(rep.role),
                  name: normalize(rep.name),
                  email: normalize(rep.email ?? ""),
                  phone: normalize(rep.phone ?? ""),
                }))
                .filter((rep) => rep.role || rep.name || rep.email || rep.phone)
                .map((rep) => ({
                  id: rep.id,
                  role: rep.role,
                  name: rep.name,
                  email: rep.email || undefined,
                  phone: rep.phone || undefined,
                }));

              void (async () => {
                try {
                  const response = await fetch("/api/association", {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      name: normalize(form.name),
                      logoUrl: form.logoUrl || undefined,
                      taxId: normalize(form.taxId) || undefined,
                      phone: normalize(form.phone) || undefined,
                      contactEmail: normalize(form.contactEmail) || undefined,
                      location: normalize(form.location) || undefined,
                      address: normalize(form.address) || undefined,
                      membershipSettings: membershipPreview.settings,
                      representatives:
                        representatives.length > 0 ? representatives : undefined,
                    }),
                  });

                  const session =
                    await parseApiResponse<SessionBootstrapPayload>(response);
                  applySessionPayload(session);
                  setLastSavedAt(Date.now());
                } catch (error) {
                  console.error(error);
                }
              })();
            }}
            disabled={!hasChanges || !normalize(form.name)}
            className="rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow disabled:cursor-not-allowed disabled:opacity-40"
          >
            Guardar cambios
          </button>
        </div>
      </div>

      <Modal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="¿Eliminar asociación?"
      >
        <p className="mb-6">
          ¿Seguro que quieres eliminar <strong>{association?.name || "esta asociación"}</strong>?
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmDelete(false)}
            className="rounded-lg border px-4 py-2"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              setConfirmDeleteFinal(true);
              setConfirmDelete(false);
            }}
            className="rounded-lg bg-red-600 px-4 py-2 text-white"
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
        <p className="mb-6 font-medium text-red-600">
          Esta acción no se puede deshacer y cerrará tu sesión.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmDeleteFinal(false)}
            className="rounded-lg border px-4 py-2"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              void (async () => {
                try {
                  const response = await fetch("/api/association", {
                    method: "DELETE",
                  });
                  await parseApiResponse<{ success: true }>(response);
                  clearClientSession();
                  router.replace("/login");
                } catch (error) {
                  console.error(error);
                } finally {
                  setConfirmDeleteFinal(false);
                }
              })();
            }}
            className="rounded-lg bg-red-700 px-4 py-2 text-white"
          >
            Eliminar definitivamente
          </button>
        </div>
      </Modal>
    </div>
  );
}
