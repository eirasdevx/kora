"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageTopbar from "@/components/PageTopbar";
import BackLink from "@/components/shared/BackLink";
import SectionBlock from "@/components/shared/SectionBlock";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import { useTransactionsStore } from "@/modules/accounting/transactions.store";
import { useSessionStore } from "@/core/session/session.store";
import {
  formatMemberId,
  resolveFeeCycle,
  resolveMemberPermissions,
  resolveMemberTier,
} from "@/modules/people/people.utils";

type PaymentStatus = "Pagado" | "Pendiente";

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  Pagado: "bg-emerald-50 text-emerald-700",
  Pendiente: "bg-amber-50 text-amber-700",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatMonthDay(value: Date) {
  return value.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

function getDisplayName(firstName?: string, lastName?: string, fallback?: string) {
  const composed = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  if (composed) return composed;
  return fallback ?? "Sin nombre";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export default function MemberDetailPage() {
  const params = useParams();
  const memberId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { contacts, loadContacts } = useContactsStore();
  const { transactions, loadTransactions } = useTransactionsStore();
  const association = useSessionStore((s) => s.association);

  useEffect(() => {
    loadContacts();
    loadTransactions();
  }, [loadContacts, loadTransactions]);

  const member = useMemo(
    () => contacts.find((c) => c.id === memberId),
    [contacts, memberId]
  );

  const tier = member ? resolveMemberTier(member.id) : "Pleno";
  const feeCycle = member ? resolveFeeCycle(member.id) : "Mensual";
  const memberIdLabel = member ? formatMemberId(member.id) : "#KO-0000";

  const membershipTransactions = useMemo(() => {
    if (!memberId) return [];
    return transactions.filter(
      (tx) =>
        tx.category === "membership" &&
        (tx.contactId === memberId || tx.contactIds?.includes(memberId))
    );
  }, [transactions, memberId]);

  const pendingAmount = membershipTransactions
    .filter((tx) => tx.status === "pending")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const lastCompleted = [...membershipTransactions]
    .filter((tx) => tx.status === "completed")
    .sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];

  const nextChargeDate = lastCompleted
    ? addMonths(new Date(lastCompleted.date), feeCycle === "Anual" ? 12 : 1)
    : addMonths(new Date(), feeCycle === "Anual" ? 12 : 1);

  const paymentHistory = [...membershipTransactions]
    .filter((tx) => tx.status === "completed")
    .sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    .slice(0, 4);

  const permissions = member ? resolveMemberPermissions(member.id) : { I: true, V: true, C: true };

  if (!member) {
    return (
      <div className="space-y-6">
        <PageTopbar>
          <div className="flex items-center gap-4">
            <BackLink
              href="/people/members"
              label="Volver a Socios"
            />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Socio no encontrado
              </h1>
              <p className="text-sm text-gray-500">
                No pudimos localizar este perfil.
              </p>
            </div>
          </div>
        </PageTopbar>
      </div>
    );
  }

  const displayName = getDisplayName(
    member.firstName,
    member.lastName,
    member.fullName
  );
  const initials = getInitials(displayName);
  const memberSince = member.createdAt
    ? formatDate(member.createdAt)
    : "-";
  const memberSinceYear = member.createdAt
    ? new Date(member.createdAt).getFullYear()
    : new Date().getFullYear();
  const years = Math.max(
    0,
    new Date().getFullYear() - memberSinceYear
  );

  const currentBalanceLabel =
    pendingAmount > 0 ? "Pendiente" : "Al dia";

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageTopbar>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BackLink
              href="/people/members"
              label="Volver a Socios"
            />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Ficha de Socio: {displayName}
              </h1>
              <p className="text-sm text-gray-500">
                Datos, pagos y permisos del socio.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                <span className="material-symbols-outlined text-[18px]">
                  search
                </span>
              </span>
              <input
                type="text"
                placeholder="Buscar socio..."
                className="w-64 rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600">
              <span className="material-symbols-outlined text-[20px]">
                notifications
              </span>
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initials || "JD"}
            </span>
          </div>
        </div>
      </PageTopbar>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-6">
            <div className="relative h-24 w-24">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-primary/10 text-xl font-semibold text-primary shadow-sm">
                {member.photoUrl ? (
                  <img
                    src={member.photoUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold text-gray-900">
                  {displayName}
                </h2>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  ACTIVO
                </span>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {tier.toUpperCase()}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                ID: {memberIdLabel}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-gray-400">
                    calendar_today
                  </span>
                  Miembro desde {memberSince}
                </span>
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-gray-400">
                    military_tech
                  </span>
                  Antigüedad: {years} años
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href={`/contacts/${member.id}/edit`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow"
              >
                <span className="material-symbols-outlined text-[18px]">
                  edit
                </span>
                Editar Perfil
              </Link>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                <span className="material-symbols-outlined text-[18px]">
                  download
                </span>
                Descargar Ficha
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 p-6 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15">
              <span className="material-symbols-outlined text-[20px]">
                groups
              </span>
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                Asociación
              </p>
              <p className="text-lg font-semibold">
                {association?.name || "Kora"}
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold">{displayName}</p>
              <p className="text-sm text-white/80">
                Socio {tier}
              </p>
              <p className="text-sm text-white/80">{memberIdLabel}</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-3xl font-semibold">
              {initials}
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-white/70">Validez</p>
              <p className="text-lg font-semibold">
                {new Date().getFullYear()}
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
              <span className="material-symbols-outlined text-[24px]">
                qr_code_2
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Saldo actual
              </p>
              <p className="mt-3 text-3xl font-semibold text-gray-900">
                {formatCurrency(pendingAmount)}
              </p>
              <p
                className={`mt-1 text-xs ${
                  pendingAmount > 0
                    ? "text-amber-600"
                    : "text-emerald-600"
                }`}
              >
                {currentBalanceLabel}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Próximo cobro
              </p>
              <p className="mt-3 text-3xl font-semibold text-gray-900">
                {formatMonthDay(nextChargeDate)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Cuota {feeCycle}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Método pago
              </p>
              <p className="mt-3 text-lg font-semibold text-gray-900">
                Visa •••• 4242
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Suscripción automática
              </p>
            </div>
          </div>

          <SectionBlock
            title="Historial de Pagos Recientes"
            subtitle="Últimos movimientos de cuota"
            actions={
              <Link
                href="/finance"
                className="text-xs font-semibold text-primary"
              >
                Ver todo
              </Link>
            }
          >
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Importe</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-sm text-gray-500"
                    >
                      No hay pagos registrados todavía.
                    </td>
                  </tr>
                ) : (
                  paymentHistory.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          Cuota {feeCycle}
                        </div>
                        <div className="text-xs text-gray-500">
                          {tier}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-semibold text-gray-900">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            PAYMENT_STYLES[
                              tx.status === "completed"
                                ? "Pagado"
                                : "Pendiente"
                            ]
                          }`}
                        >
                          {tx.status === "completed"
                            ? "Pagado"
                            : "Pendiente"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            receipt_long
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </SectionBlock>
        </div>

        <SectionBlock
          title="Privacidad y Permisos"
          subtitle="Control de consentimientos"
          actions={
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500"
            >
              <span className="material-symbols-outlined text-[18px]">
                settings
              </span>
            </button>
          }
        >
          <div className="space-y-3">
            {[
              {
                key: "I",
                title: "Imagen",
                subtitle: "Uso de fotos y videos",
                enabled: permissions.I,
              },
              {
                key: "V",
                title: "Voz",
                subtitle: "Grabaciones de audio",
                enabled: permissions.V,
              },
              {
                key: "C",
                title: "Comunicaciones",
                subtitle: "Boletín y promociones",
                enabled: permissions.C,
              },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-gray-600">
                    <span className="material-symbols-outlined text-[18px]">
                      {item.key === "I"
                        ? "image"
                        : item.key === "V"
                          ? "mic"
                          : "mail"}
                    </span>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    item.enabled
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {item.enabled ? "AUTORIZADO" : "SOLO EMAIL"}
                </span>
              </div>
            ))}
            <button
              type="button"
              className="w-full rounded-xl border border-dashed border-gray-300 px-4 py-2 text-xs font-semibold text-gray-400"
            >
              ACTUALIZAR CONSENTIMIENTOS
            </button>
          </div>
        </SectionBlock>
      </section>
    </div>
  );
}
