"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ModuleTopbar, {
  moduleTopbarButtonStyles,
} from "@/components/shared/ModuleTopbar";
import { useSessionStore } from "@/core/session/session.store";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import { ContactType } from "@/modules/contacts/contact.types";
import { useMessagingStore } from "@/modules/messaging/messaging.store";
import {
  type EmailProvider,
  useMessagingSettingsStore,
} from "@/modules/messaging/messaging.settings.store";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

type RecipientPayload = {
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
};

const FILTERS: Array<{ id: "all" | ContactType; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "member", label: "Socios" },
  { id: "provider", label: "Proveedores" },
  { id: "collaborator", label: "Colaboradores" },
  { id: "sponsor", label: "Patrocinadores" },
  { id: "other", label: "Otros" },
];

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
    "Activa la verificación en dos pasos (2FA).",
    "Crea una App Password para Kora.",
    "Usa tu Gmail y la App Password en la app.",
  ],
  outlook: [
    "Activa la verificación en dos pasos (MFA).",
    "Crea una contraseña de aplicación o credencial SMTP.",
    "Usa tu correo y la contraseña SMTP en la app.",
  ],
  yahoo: [
    "Activa la verificación en dos pasos.",
    "Genera una App Password para correo.",
    "Usa tu Yahoo y la App Password en la app.",
  ],
  custom: [
    "Solicita a tu proveedor el host, puerto y tipo de seguridad.",
    "Usa el usuario/correo y la contraseña SMTP.",
    "Completa los datos y guarda los cambios.",
  ],
};

const applyPreviewVariables = (value: string) => {
  const replacements: Record<string, string> = {
    "{nombre_socio}": "Carlos",
    "{apellido_socio}": "Gómez",
    "{email_usuario}": "carlos@asociacion.org",
    "{nombre_evento}": "Asamblea General",
    "{monto_deuda}": "35 EUR",
    "{fecha_evento}": "22/10/2026",
    "{hora_inicio}": "19:30",
    "{ultimo_pago}": "03/09/2026",
  };
  return Object.entries(replacements).reduce(
    (acc, [token, replacement]) => acc.replaceAll(token, replacement),
    value
  );
};

const MESSAGING_MODULE_TITLE = "Mensajería";
const MESSAGING_MODULE_DESCRIPTION =
  "Plantillas, campañas y comunicaciones personalizadas.";

export default function MessagingBulkPage() {
  const mode = useSessionStore((s) => s.mode);
  const association = useSessionStore((s) => s.association);
  const { templates } = useMessagingStore();
  const {
    settings,
    hydrated,
    loadSettings,
  } = useMessagingSettingsStore();
  const { contacts, loadContacts } = useContactsStore();
  const searchParams = useSearchParams();

  const [templateId, setTemplateId] = useState(templates[0]?.id ? "");
  const [queryApplied, setQueryApplied] = useState(false);
  const [filter, setFilter] = useState<"all" | ContactType>("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [associationName, setAssociationName] = useState("");
  const [associationEmail, setAssociationEmail] = useState("");
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
    if (queryApplied) return;
    if (!templates.length) return;
    const templateFromQuery = searchParams.get("templateId");
    if (!templateFromQuery) {
      setQueryApplied(true);
      return;
    }
    const exists = templates.some((item) => item.id === templateFromQuery);
    if (exists) {
      setTemplateId(templateFromQuery);
    }
    setQueryApplied(true);
  }, [queryApplied, searchParams, templates]);

  useEffect(() => {
    if (!hydrated) return;
    setAssociationName(
      settings.senderName || association?.name || ""
    );
    setAssociationEmail(
      settings.emailAddress || association?.contactEmail || ""
    );
  }, [
    hydrated,
    settings.senderName,
    settings.emailAddress,
    association,
  ]);

  const activeTemplate = useMemo(
    () => templates.find((item) => item.id === templateId) ? null,
    [templates, templateId]
  );

  useEffect(() => {
    if (!activeTemplate) return;
    setSubject(activeTemplate.subject);
    setHtmlMessage(activeTemplate.html);
  }, [activeTemplate]);

  const filteredContacts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return contacts.filter((contact) => {
      const matchesFilter =
        filter === "all" || contact.types.includes(filter);
      const matchesSearch =
        !term ||
        `${contact.firstName} ${contact.lastName}`
          .toLowerCase()
          .includes(term) ||
        (contact.email ? "").toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [contacts, filter, search]);

  const selectableContacts = useMemo(
    () => filteredContacts.filter((contact) => contact.email),
    [filteredContacts]
  );

  const selectedRecipients = useMemo<RecipientPayload[]>(() => {
    const ids = selectedIds;
    const unique = new Map<string, RecipientPayload>();
    selectableContacts
      .filter((contact) => ids.has(contact.id))
      .forEach((contact) => {
        const email = (contact.email ? "").trim().toLowerCase();
        if (!EMAIL_REGEX.test(email)) return;
        if (unique.has(email)) return;
        unique.set(email, {
          email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          fullName: contact.fullName,
        });
      });
    return Array.from(unique.values());
  }, [selectableContacts, selectedIds]);

  const previewHtml = useMemo(
    () => applyPreviewVariables(htmlMessage),
    [htmlMessage]
  );

  const providerPreset =
    settings.emailProvider === "custom"
      ? null
      : PROVIDER_SMTP[
          settings.emailProvider as Exclude<EmailProvider, "custom">
        ];
  const customSecurityLabel = settings.smtpSecure ? "SSL/TLS" : "STARTTLS";
  const messagingReady = Boolean(
    associationName &&
      associationEmail &&
      (settings.hasEmailAppPassword || settings.emailAppPassword)
  );

  const toggleRecipient = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    const allIds = selectableContacts.map((contact) => contact.id);
    const allSelected = allIds.every((id) => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(allIds));
  };

  // Envío masivo usando la API interna.
  const handleSend = async () => {
    if (!activeTemplate) {
      setSendError("Selecciona una plantilla.");
      return;
    }
    if (!messagingReady) {
      setSendError(
        "Configura el remitente SMTP de esta asociación antes de enviar."
      );
      return;
    }
    if (!subject || !htmlMessage) {
      setSendError("Completa el asunto y el mensaje.");
      return;
    }
    if (selectedRecipients.length === 0) {
      setSendError("Selecciona al menos un destinatario válido.");
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
          useCurrentAssociation: true,
          recipients: selectedRecipients,
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
        sentCount: data.sentCount ? 0,
        failedCount: data.failedCount ? 0,
        errors,
      });
      if (errors.length > 0) {
        const first = errors[0];
        setSendError(
          `Error en ${errors.length} envíos. Ejemplo: ${first.recipient} - ${first.message}`
        );
      }
    } catch {
      setSendError(
        "No se pudo enviar el correo. Revisa la configuración SMTP de esta asociación."
      );
    } finally {
      setSending(false);
    }
  };

  if (mode === "guest") {
    return (
      <div className="space-y-6">
        <ModuleTopbar
          module={MESSAGING_MODULE_TITLE}
          title="Envío de mensajes masivos"
          description={MESSAGING_MODULE_DESCRIPTION}
          actions={
            <Link
              href="/dashboard"
              className={moduleTopbarButtonStyles.secondary}
            >
              Volver al panel
            </Link>
          }
        />

        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <span className="material-symbols-outlined text-[24px]">info</span>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            Envío masivo no disponible en modo invitado
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Inicia sesión para seleccionar destinatarios y realizar campañas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleTopbar
        module={MESSAGING_MODULE_TITLE}
        title="Envío de mensajes masivos"
        description={MESSAGING_MODULE_DESCRIPTION}
        actions={
          <Link
            href="/messaging"
            className={moduleTopbarButtonStyles.secondary}
          >
            Volver a mensajes
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                1
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Seleccionar plantilla
                </h2>
                <p className="text-sm text-slate-500">
                  Define el contenido principal del correo.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <select
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
              <div className="rounded-2xl border border-primary bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
                Email
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                2
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Filtrar destinatarios
                </h2>
                <p className="text-sm text-slate-500">
                  Selecciona a quienes recibirán el correo.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold ${
                    filter === item.id
                      ? "bg-primary text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={toggleAll}
                className="ml-auto rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Seleccionar todos
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
              <span className="material-symbols-outlined text-[18px] text-slate-400">
                search
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar destinatario..."
                className="w-full bg-transparent text-sm text-slate-700 outline-none"
              />
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-[0.3fr_1.3fr_0.6fr_0.6fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                <span />
                <span>Nombre</span>
                <span>Categoría</span>
                <span>Correo</span>
              </div>
              <div className="max-h-[320px] divide-y divide-slate-100 overflow-y-auto">
                {filteredContacts.length === 0 ? (
                  <div className="px-4 py-5 text-sm text-slate-500">
                    No hay contactos disponibles.
                  </div>
                ) : (
                  filteredContacts.map((contact) => {
                    const name = `${contact.firstName} ${contact.lastName}`.trim();
                    const hasEmail = Boolean(contact.email);
                    return (
                      <div
                        key={contact.id}
                        className="grid grid-cols-[0.3fr_1.3fr_0.6fr_0.6fr] gap-3 px-4 py-3 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(contact.id)}
                          onChange={() => toggleRecipient(contact.id)}
                          disabled={!hasEmail}
                          className="h-4 w-4"
                        />
                        <span className="font-semibold text-slate-900">
                          {name || "Sin nombre"}
                        </span>
                        <span className="text-xs text-slate-500">
                          {contact.types[0] ? "-"}
                        </span>
                        <span className="text-xs text-slate-500">
                          {contact.email ? "Sin correo"}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                Email
              </span>
              <span className="material-symbols-outlined text-gray-400">
                visibility
              </span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              Previsualización
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
                {selectedRecipients.length} destinatarios
              </span>
            </div>
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
                Mensaje
              </p>
              <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
                <p className="text-xs font-semibold text-gray-400">
                  {subject || "Asunto sin definir"}
                </p>
                <div
                  className="prose prose-sm mt-3 max-w-none"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
                Resumen del envío
              </p>
              <div className="grid gap-3 text-sm text-gray-600">
                <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2">
                  <span className="font-semibold text-gray-700">
                    Total destinatarios
                  </span>
                  <span>{selectedRecipients.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2">
                  <span className="font-semibold text-gray-700">
                    Tiempo estimado
                  </span>
                  <span>~{Math.ceil(selectedRecipients.length * 1.5)}s</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                Credenciales de correo
              </h3>
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
                <div className="mt-4 space-y-2 text-sm text-slate-600">
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
                        {providerPreset?.host ? "-"}
                      </span>
                      :{providerPreset?.port ? "-"} ({" "}
                      {providerPreset?.note ? "SMTP"})
                    </p>
                  )}
                  <p className="text-xs text-slate-400">
                    Configura las credenciales en Ajustes &gt; Mensajería.
                  </p>
                  <Link
                    href="/settings/messaging"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Ir a configuración
                  </Link>
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Guía rápida de conexión
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
        </aside>
      </div>
    </div>
  );
}
