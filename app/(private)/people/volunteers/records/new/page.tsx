"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PageTopbar from "@/components/PageTopbar";
import BackLink from "@/components/shared/BackLink";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import { useVolunteerActivitiesStore } from "@/modules/volunteers/volunteer-activities.store";
import { useEventsStore } from "@/modules/events/events.store";
import { Contact } from "@/modules/contacts/contact.types";
import { VolunteerProfileType } from "@/modules/volunteers/volunteer-activity.types";

function getDisplayName(contact: Contact) {
  const composed = `${contact.firstName} ${contact.lastName}`.trim();
  if (composed) return composed;
  return contact.fullName ?? "Sin nombre";
}

function toInputDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function toIsoDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function buildId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function VolunteerRecordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("volunteerId");

  const { contacts, loadContacts } = useContactsStore();
  const { activities, addActivity, loadActivities } =
    useVolunteerActivitiesStore();
  const { events, loadEvents } = useEventsStore();

  const [profileType, setProfileType] =
    useState<VolunteerProfileType>("member");
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [ignorePreselected, setIgnorePreselected] = useState(false);
  const [activityDate, setActivityDate] = useState(
    toInputDate(new Date().toISOString())
  );
  const [hours, setHours] = useState("0");
  const [eventId, setEventId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadContacts();
    loadActivities();
    loadEvents();
  }, [loadContacts, loadActivities, loadEvents]);

  const preselectedContact = useMemo(
    () => contacts.find((contact) => contact.id === preselectedId) ?? null,
    [contacts, preselectedId]
  );
  const preselectedProfileType: VolunteerProfileType =
    preselectedContact?.types.includes("member") ? "member" : "contact";
  const usingPreselectedContact =
    !ignorePreselected && !selectedId && Boolean(preselectedContact);
  const effectiveProfileType = usingPreselectedContact
    ? preselectedProfileType
    : profileType;
  const currentSelectedId = usingPreselectedContact
    ? preselectedId ?? ""
    : selectedId;
  const searchValue =
    usingPreselectedContact && !search && preselectedContact
      ? getDisplayName(preselectedContact)
      : search;

  const contactPool = useMemo(() => {
    if (effectiveProfileType === "member") {
      return contacts.filter((contact) =>
        contact.types.includes("member")
      );
    }
    return contacts.filter((contact) => !contact.types.includes("member"));
  }, [contacts, effectiveProfileType]);

  const filteredContacts = contactPool.filter((contact) => {
    if (!searchValue.trim()) return true;
    const name = getDisplayName(contact).toLowerCase();
    const dni = contact.dni?.toLowerCase() ?? "";
    return (
      name.includes(searchValue.toLowerCase()) ||
      dni.includes(searchValue.toLowerCase())
    );
  });

  const selectedContact =
    contacts.find((contact) => contact.id === currentSelectedId) ?? null;

  const handleSelectContact = (contact: Contact) => {
    const nextProfileType: VolunteerProfileType = contact.types.includes("member")
      ? "member"
      : "contact";
    setSelectedId(contact.id);
    setSearch(getDisplayName(contact));
    setProfileType(nextProfileType);
    setIgnorePreselected(true);
  };

  const handleSave = async () => {
    setError(null);
    if (!currentSelectedId) {
      setError("Selecciona un voluntario.");
      return;
    }
    const numericHours = Number(hours);
    if (!activityDate || Number.isNaN(numericHours) || numericHours <= 0) {
      setError("Indica una fecha valida y horas mayores a 0.");
      return;
    }

    setSaving(true);
    const activity = {
      id: buildId(),
      contactId: currentSelectedId,
      profileType: effectiveProfileType,
      date: toIsoDate(activityDate),
      hours: numericHours,
      eventId: eventId || undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    await addActivity(activity);
    setSaving(false);
    router.push("/people/volunteers");
  };

  const recentActivityCount = activities.filter(
    (activity) => activity.contactId === currentSelectedId
  ).length;

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageTopbar>
        <div className="mb-4">
          <BackLink href="/people/volunteers" label="Volver a Voluntarios" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">
            Nuevo registro de actividad
          </h1>
          <p className="text-sm text-gray-500">
            Documenta las horas y actividades realizadas por los miembros de la red.
          </p>
        </div>
      </PageTopbar>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Tipo de Perfil
              </label>
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-gray-50 p-1">
                {[
                  { label: "Socio", value: "member" },
                  { label: "Contacto", value: "contact" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setProfileType(item.value as VolunteerProfileType);
                      setSelectedId("");
                      setSearch("");
                      setIgnorePreselected(true);
                    }}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      profileType === item.value
                        ? "bg-white text-primary shadow"
                        : "text-gray-500"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Nombre del Voluntario
              </label>
              <div className="relative mt-2">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                  <span className="material-symbols-outlined text-[18px]">
                    search
                  </span>
                </span>
                <input
                  value={searchValue}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setSelectedId("");
                    setIgnorePreselected(true);
                  }}
                  placeholder="Buscar por nombre o DNI..."
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                />
              </div>
              {search && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                  {filteredContacts.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-500">
                      No hay resultados con ese criterio.
                    </p>
                  ) : (
                    filteredContacts.slice(0, 6).map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => handleSelectContact(contact)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {getDisplayName(contact)
                            .split(" ")
                            .slice(0, 2)
                            .map((part) => part[0]?.toUpperCase())
                            .join("")}
                        </span>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {getDisplayName(contact)}
                          </p>
                          <p className="text-xs text-gray-500">{contact.dni || "-"}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
              {selectedContact ? (
                <p className="mt-2 text-xs text-gray-500">
                  Seleccionado: {getDisplayName(selectedContact)} (
                  {recentActivityCount} registros)
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Fecha de Actividad
                </label>
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                    <span className="material-symbols-outlined text-[18px]">
                      calendar_today
                    </span>
                  </span>
                  <input
                    type="date"
                    value={activityDate}
                    onChange={(event) => setActivityDate(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Total de Horas
                </label>
                <div className="mt-2 flex items-center overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={hours}
                    onChange={(event) => setHours(event.target.value)}
                    className="w-full px-3 py-2.5 text-sm text-gray-700 focus:outline-none"
                  />
                  <span className="border-l border-gray-200 px-3 text-sm text-gray-500">
                    Horas
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Evento relacionado (Opcional)
              </label>
              <div className="relative mt-2">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                  <span className="material-symbols-outlined text-[18px]">
                    event
                  </span>
                </span>
                <select
                  value={eventId}
                  onChange={(event) => setEventId(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                >
                  <option value="">
                    Ninguno - Actividad puntual
                  </option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Descripción de la actividad / Notas
              </label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Detalla las tareas realizadas, incidencias o comentarios relevantes..."
                className="mt-2 h-40 w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
              <p className="mt-2 text-xs text-gray-400">
                Recomendado para actividades que no forman parte de un evento específico.
              </p>
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-4 text-sm font-semibold text-rose-600">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/people/volunteers")}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Guardar Registro
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-700">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-blue-600">
              <span className="material-symbols-outlined text-[18px]">
                info
              </span>
            </span>
            <div>
              <p className="font-semibold">
                ¿Necesitas importar registros masivos?
              </p>
              <p className="text-xs text-blue-700/80">
                Puedes subir un archivo CSV desde la sección de herramientas avanzadas en Ajustes.
              </p>
            </div>
          </div>
          <Link
            href="/settings"
            className="text-sm font-semibold text-blue-700"
          >
            Ir a Importar
          </Link>
        </div>
      </section>
    </div>
  );
}
