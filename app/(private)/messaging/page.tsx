"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageTopbar from "@/components/PageTopbar";
import { useSessionStore } from "@/core/session/session.store";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import { ContactType } from "@/modules/contacts/contact.types";
import { useMessagingStore } from "@/modules/messaging/messaging.store";
import { MessageTemplate } from "@/modules/messaging/messaging.types";
import {
  type EmailProvider,
  useMessagingSettingsStore,
} from "@/modules/messaging/messaging.settings.store";

const CHANNEL_BADGE: Record<string, string> = {
  email: "bg-blue-50 text-blue-600",
};

const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
};

const PROVIDER_LABELS: Record<EmailProvider, string> = {
  gmail: "Gmail",
  outlook: "Outlook / Office 365",
  yahoo: "Yahoo",
  custom: "SMTP personalizado",
};

const PROVIDER_SMTP: Record<
  Exclude<EmailProvider, "custom">,
  { host: string; port: number; secure: boolean; note: string }
> = {
  gmail: {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    note: "SSL/TLS",
  },
  outlook: {
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    note: "STARTTLS",
  },
  yahoo: {
    host: "smtp.mail.yahoo.com",
    port: 465,
    secure: true,
    note: "SSL/TLS",
  },
};

const PROVIDER_STEPS: Record<EmailProvider, string[]> = {
  gmail: [
    "Activa la verificacion en dos pasos (2FA).",
    "Crea una App Password para Kora.",
    "Usa tu Gmail y la App Password en la app.",
  ],
  outlook: [
    "Activa la verificacion en dos pasos (MFA).",
    "Crea una contrasena de aplicacion o credencial SMTP.",
    "Usa tu correo y la contrasena SMTP en la app.",
  ],
  yahoo: [
    "Activa la verificacion en dos pasos.",
    "Genera una App Password para correo.",
    "Usa tu Yahoo y la App Password en la app.",
  ],
  custom: [
    "Solicita a tu proveedor el host, puerto y tipo de seguridad.",
    "Usa el usuario/correo y la contrasena SMTP.",
    "Completa los datos y guarda los cambios.",
  ],
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

type RecipientPayload = {
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
};

const parseEmails = (value: string) =>
  value
    .split(/[\n,;]+/g)
    .map((item) => item.trim())
    .filter(Boolean);

const applyPreviewVariables = (value: string) => {
  const replacements: Record<string, string> = {
    "{nombre_socio}": "Maria Rivera",
    "{apellido_socio}": "Lopez",
    "{email_usuario}": "maria@asociacion.org",
    "{nombre_evento}": "Asamblea General",
    "{monto_deuda}": "25 EUR",
    "{fecha_evento}": "15/10/2026",
    "{hora_inicio}": "19:30",
    "{ultimo_pago}": "02/09/2026",
  };
  return Object.entries(replacements).reduce(
    (acc, [token, replacement]) => acc.replaceAll(token, replacement),
    value
  );
};

export default function MessagingPage() {
  const association = useSessionStore((s) => s.association);
  const { contacts, loadContacts } = useContactsStore();
  const { templates, removeTemplate } = useMessagingStore();
  const {
    settings,
    hydrated,
    loadSettings,
  } = useMessagingSettingsStore();
  const [search, setSearch] = useState("");
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(
    templates[0]?.id ?? null
  );

  const [recipientGroup, setRecipientGroup] = useState<
    "all" | ContactType | "manual"
  >("member");
  const [manualRecipients, setManualRecipients] = useState("");
  const [associationName, setAssociationName] = useState("");
  const [associationEmail, setAssociationEmail] = useState("");
  const [associationAppPassword, setAssociationAppPassword] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlMessage, setHtmlMessage] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{
    sentCount: number;
    failedCount: number;
    errors?: Array<{ recipient: string; message: string }>;
  } | null>(null);
  const [sending, setSending] = useState(false);
  const [showCredentials, setShowCredentials] = useState(true);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!activeTemplateId && templates[0]) {
      setActiveTemplateId(templates[0].id);
    }
  }, [templates, activeTemplateId]);

  useEffect(() => {
    if (!hydrated) return;
    setAssociationName(
      settings.senderName || association?.name || ""
    );
    setAssociationEmail(
      settings.emailAddress || association?.contactEmail || ""
    );
    setAssociationAppPassword(settings.emailAppPassword || "");
  }, [
    hydrated,
    settings.senderName,
    settings.emailAddress,
    settings.emailAppPassword,
    association,
  ]);

  const activeTemplate = useMemo(
    () => templates.find((item) => item.id === activeTemplateId) ?? null,
    [templates, activeTemplateId]
  );

  useEffect(() => {
    if (!activeTemplate) return;
    setSubject(activeTemplate.subject);
    setHtmlMessage(activeTemplate.html);
  }, [activeTemplate]);

  const filteredTemplates = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return templates;
    return templates.filter((template) =>
      [template.title, template.channel, template.subject]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [templates, search]);

  const recipientPayloads = useMemo<RecipientPayload[]>(() => {
    if (recipientGroup === "manual") {
      return parseEmails(manualRecipients).map((email) => ({ email }));
    }
    const pool =
      recipientGroup === "all"
        ? contacts
        : contacts.filter((contact) =>
            contact.types.includes(recipientGroup)
          );
    return pool
      .filter((contact) => contact.email)
      .map((contact) => ({
        email: contact.email ?? "",
        firstName: contact.firstName,
        lastName: contact.lastName,
        fullName: contact.fullName,
      }));
  }, [contacts, recipientGroup, manualRecipients]);

  const recipients = useMemo<RecipientPayload[]>(() => {
    const unique = new Map<string, RecipientPayload>();
    recipientPayloads.forEach((payload) => {
      const email = payload.email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(email)) return;
      if (unique.has(email)) return;
      unique.set(email, { ...payload, email });
    });
    return Array.from(unique.values());
  }, [recipientPayloads]);

  const previewHtml = useMemo(
    () => applyPreviewVariables(htmlMessage || activeTemplate?.html || ""),
    [htmlMessage, activeTemplate]
  );

  const providerPreset =
    settings.emailProvider === "custom"
      ? null
      : PROVIDER_SMTP[
          settings.emailProvider as Exclude<EmailProvider, "custom">
        ];
  const customSecurityLabel = settings.smtpSecure ? "SSL/TLS" : "STARTTLS";

  // Envio masivo usando la API interna.
  const handleSend = async () => {
    if (!activeTemplate) {
      setSendError("Selecciona una plantilla antes de enviar.");
      return;
    }
    if (!associationName || !associationEmail || !associationAppPassword) {
      setSendError("Completa el correo y la contrasena SMTP.");
      return;
    }
    if (!subject || !htmlMessage) {
      setSendError("Completa el asunto y el mensaje.");
      return;
    }
    if (recipients.length === 0) {
      setSendError("No hay destinatarios validos.");
      return;
    }

    setSendError(null);
    setSendResult(null);
    setSending(true);

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          associationName,
          associationEmail,
          associationAppPassword,
          emailProvider: settings.emailProvider,
          smtpHost: settings.smtpHost,
          smtpPort: settings.smtpPort,
          smtpSecure: settings.smtpSecure,
          recipients,
          subject,
          htmlMessage,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error("No se pudo enviar el correo.");
      }
      const errors = Array.isArray(data.errors) ? data.errors : [];
      setSendResult({
        sentCount: data.sentCount ?? 0,
        failedCount: data.failedCount ?? 0,
        errors,
      });
      if (errors.length > 0) {
        const first = errors[0];
        setSendError(
          `Error en ${errors.length} envios. Ejemplo: ${first.recipient} - ${first.message}`
        );
      }
    } catch {
      setSendError("No se pudo enviar el correo. Revisa los datos.");
    } finally {
      setSending(false);
    }
  };

  const handleDeleteTemplate = (template: MessageTemplate) => {
    const confirmed = window.confirm(
      `Eliminar la plantilla "${template.title}"?`
    );
    if (!confirmed) return;
    removeTemplate(template.id);
    if (template.id === activeTemplateId) {
      setActiveTemplateId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageTopbar>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Mensajeria
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Biblioteca de Plantillas
            </h1>
            <p className="text-sm text-slate-500">
              Gestiona plantillas y configura envios masivos.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/messaging/bulk"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
            >
              Ver envio masivo
            </Link>
            <Link
              href="/messaging/templates/new"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary/90"
            >
              + Nueva plantilla
            </Link>
          </div>
        </div>
      </PageTopbar>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Biblioteca de plantillas
              </h2>
              <p className="text-sm text-slate-500">
                Crea y administra mensajes predefinidos.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
                <span className="material-symbols-outlined text-[18px] text-slate-400">
                  search
                </span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar plantilla..."
                  className="w-52 bg-transparent text-sm text-slate-700 outline-none"
                />
              </div>
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Filtros
              </button>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.4fr] gap-4 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              <span>Titulo</span>
              <span>Canal</span>
              <span>Actualizado</span>
              <span className="text-right">Acciones</span>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredTemplates.length === 0 ? (
                <div className="px-5 py-6 text-sm text-slate-500">
                  No hay plantillas disponibles.
                </div>
              ) : (
                filteredTemplates.map((template) => {
                  const isActive = template.id === activeTemplateId;
                  return (
                    <div
                      key={template.id}
                      className={`grid grid-cols-[1.4fr_0.7fr_0.7fr_0.4fr] gap-4 px-5 py-4 text-sm ${
                        isActive ? "bg-primary/5" : "bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveTemplateId(template.id)}
                        className="text-left"
                      >
                        <p className="font-semibold text-slate-900">
                          {template.title}
                        </p>
                        <p className="text-xs text-slate-400">
                          ID: {template.id}
                        </p>
                      </button>
                      <div className="flex items-center">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${CHANNEL_BADGE[template.channel]}`}
                        >
                          {CHANNEL_LABEL[template.channel]}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(template.updatedAt).toLocaleString("es-ES", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/messaging/templates/new?id=${template.id}`}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Editar
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(template)}
                          className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Envio masivo
              </h2>
              <p className="text-sm text-slate-500">
                Configura la campana y envia correos uno a uno.
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
              Proveedor: {PROVIDER_LABELS[settings.emailProvider]}
            </span>
          </div>

          <div className="mt-5 space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                1. Destinatarios
              </p>
              <select
                value={recipientGroup}
                onChange={(event) =>
                  setRecipientGroup(
                    event.target.value as "all" | ContactType | "manual"
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
              >
                <option value="member">Socios</option>
                <option value="collaborator">Colaboradores</option>
                <option value="provider">Proveedores</option>
                <option value="all">Todos</option>
                <option value="manual">Manual</option>
              </select>
              {recipientGroup === "manual" ? (
                <textarea
                  value={manualRecipients}
                  onChange={(event) => setManualRecipients(event.target.value)}
                  placeholder="correo1@asoc.org, correo2@asoc.org"
                  className="min-h-[90px] w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
                />
              ) : (
                <p className="text-xs text-slate-500">
                  Se usaran {recipients.length} destinatarios desde contactos.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                2. Plantilla
              </p>
              <select
                value={activeTemplateId ?? ""}
                onChange={(event) => setActiveTemplateId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title} ({CHANNEL_LABEL[template.channel]})
                  </option>
                ))}
              </select>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Asunto del correo"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
              />
              <textarea
                value={htmlMessage}
                onChange={(event) => setHtmlMessage(event.target.value)}
                placeholder="Mensaje HTML"
                className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  3. Credenciales de correo
                </p>
                <button
                  type="button"
                  onClick={() => setShowCredentials((prev) => !prev)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:bg-slate-50"
                  aria-expanded={showCredentials}
                >
                  {showCredentials ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              {showCredentials ? (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <p>
                      Proveedor:{" "}
                      <span className="font-semibold text-slate-800">
                        {PROVIDER_LABELS[settings.emailProvider]}
                      </span>
                    </p>
                    <p>
                      Remitente:{" "}
                      <span className="font-semibold text-slate-800">
                        {associationName || "Sin configurar"}
                      </span>
                    </p>
                    <p>
                      Correo:{" "}
                      <span className="font-semibold text-slate-800">
                        {associationEmail || "Sin configurar"}
                      </span>
                    </p>
                    {settings.emailProvider === "custom" ? (
                      <>
                        <p>
                          Host SMTP:{" "}
                          <span className="font-semibold text-slate-800">
                            {settings.smtpHost || "Sin configurar"}
                          </span>
                        </p>
                        <p>
                          Puerto SMTP:{" "}
                          <span className="font-semibold text-slate-800">
                            {settings.smtpPort || "-"}
                          </span>
                        </p>
                        <p>
                          Seguridad:{" "}
                          <span className="font-semibold text-slate-800">
                            {customSecurityLabel}
                          </span>
                        </p>
                      </>
                    ) : (
                      <p>
                        SMTP:{" "}
                        <span className="font-semibold text-slate-800">
                          {providerPreset?.host ?? "-"}
                        </span>
                        :{providerPreset?.port ?? "-"} ({" "}
                        {providerPreset?.note ?? "SMTP"})
                      </p>
                    )}
                    <p className="text-xs text-slate-400">
                      Configura las credenciales en Ajustes &gt; Mensajeria.
                    </p>
                  </div>
                  <Link
                    href="/settings/messaging"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Ir a configuracion
                  </Link>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Guia rapida de conexion
                    </p>
                    <ul className="mt-3 space-y-2 text-xs text-slate-600">
                      {PROVIDER_STEPS[settings.emailProvider].map(
                        (step, index) => (
                          <li key={step} className="flex items-start gap-2">
                            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                              {index + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </>
              ) : null}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                  Email
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                  Previsualizacion
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                {subject || "Asunto sin definir"}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">
                    person
                  </span>
                  {associationName || "Remitente sin definir"}
                </span>
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">
                    group
                  </span>
                  {recipients.length} destinatarios
                </span>
              </div>
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
                  Mensaje
                </p>
                <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
              </div>
            </div>

            {sendError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                {sendError}
              </div>
            ) : null}
            {sendResult ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Enviados: {sendResult.sentCount} - Fallidos:{" "}
                {sendResult.failedCount}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? "Enviando..." : "Enviar masivamente"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
