"use client";

import { ContactType } from "@/modules/contacts/contact.types";

type FilterValue = ContactType | "all";

interface Props {
  value: FilterValue;
  onChange: (v: FilterValue) => void;
  counts?: Record<FilterValue, number>;
}

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: "Todos", value: "all" },
  { label: "Socios", value: "member" },
  { label: "Proveedores", value: "provider" },
  { label: "Colaboradores", value: "collaborator" },
  { label: "Patrocinadores", value: "sponsor" },
  { label: "Otros", value: "other" },
];

export default function ContactsFilters({
  value,
  onChange,
  counts,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-gray-200">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          type="button"
          onClick={() => onChange(f.value)}
          className={`relative -mb-px flex items-center gap-2 px-2 pb-3 text-sm font-semibold transition
            ${
              value === f.value
                ? "text-primary"
                : "text-gray-500 hover:text-gray-700"
            }`}
        >
          <span>{f.label}</span>
          {typeof counts?.[f.value] === "number" && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                value === f.value
                  ? "bg-primary/10 text-primary"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {counts[f.value]}
            </span>
          )}
          {value === f.value && (
            <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-primary" />
          )}
        </button>
      ))}
    </div>
  );
}
