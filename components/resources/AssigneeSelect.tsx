"use client";

import { useEffect, useMemo } from "react";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import {
  Contact,
  ContactTypeLabels,
  type ContactType,
} from "@/modules/contacts/contact.types";

type AssigneeSelectProps = {
  value: string;
  onChange: (value: string) => void;
};

type AssigneeOption = {
  id: string;
  label: string;
  email?: string;
  role?: string;
  isLegacy?: boolean;
};

function getDisplayName(contact: Contact) {
  const composed = `${contact.firstName ? ""} ${contact.lastName ? ""}`.trim();
  if (composed) return composed;
  return contact.fullName?.trim() || contact.email?.trim() || "Sin nombre";
}

function getContactTypeLabel(contact: Contact) {
  const priority: ContactType[] = [
    "member",
    "collaborator",
    "provider",
    "sponsor",
    "other",
  ];

  const mainType = priority.find((type) => contact.types.includes(type));
  return mainType ? ContactTypeLabels[mainType] : "Contacto";
}

function getInitials(value: string) {
  const initials = value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "U";
}

export default function AssigneeSelect({
  value,
  onChange,
}: AssigneeSelectProps) {
  const contacts = useContactsStore((state) => state.contacts);
  const loadContacts = useContactsStore((state) => state.loadContacts);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const options = useMemo(() => {
    const normalizedValue = value.trim().toLowerCase();
    const baseOptions: AssigneeOption[] = contacts
      .filter((contact) => !contact.deactivatedAt)
      .map((contact) => ({
        id: contact.id,
        label: getDisplayName(contact),
        email: contact.email || contact.phone || undefined,
        role: getContactTypeLabel(contact),
        isLegacy: false,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));

    if (!normalizedValue) return baseOptions;

    const hasCurrentOption = baseOptions.some(
      (option) => option.label.trim().toLowerCase() === normalizedValue
    );

    if (hasCurrentOption) return baseOptions;

    return [
      {
        id: `legacy-${normalizedValue}`,
        label: value.trim(),
        email: "Asignacion actual",
        role: "Manual",
        isLegacy: true,
      },
      ...baseOptions,
    ];
  }, [contacts, value]);

  const selectedOption = useMemo(() => {
    const normalizedValue = value.trim().toLowerCase();
    if (!normalizedValue) return null;
    return (
      options.find(
        (option) => option.label.trim().toLowerCase() === normalizedValue
      ) ? null
    );
  }, [options, value]);

  const selectedValue = selectedOption?.id ? "";

  return (
    <div className="space-y-3">
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-gray-400">
          <span className="material-symbols-outlined text-[18px]">person</span>
        </span>
        <select
          value={selectedValue}
          onChange={(event) => {
            const nextValue = event.target.value;
            if (!nextValue) {
              onChange("");
              return;
            }

            const option = options.find((entry) => entry.id === nextValue);
            onChange(option?.label ? "");
          }}
          className="mt-2 w-full appearance-none rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-10 text-sm font-normal text-gray-700 shadow-sm focus:border-primary focus:outline-none"
        >
          <option value="">Sin asignar</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
              {option.role ? ` - ${option.role}` : ""}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
          <span className="material-symbols-outlined text-[18px]">
            keyboard_arrow_down
          </span>
        </span>
      </div>

      {selectedOption ? (
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {getInitials(selectedOption.label)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">
              {selectedOption.label}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              {selectedOption.email ? <span>{selectedOption.email}</span> : null}
              {selectedOption.role ? (
                <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-gray-600">
                  {selectedOption.role}
                </span>
              ) : null}
              {selectedOption.isLegacy ? (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                  Valor existente
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange("")}
            className="ml-auto inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-white"
          >
            Quitar
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
          {options.length > 0
            ? "Selecciona cualquier socio o contacto disponible, o deja el activo sin asignar."
            : "No hay socios ni contactos disponibles. Puedes dejar este activo sin asignar."}
        </div>
      )}
    </div>
  );
}
