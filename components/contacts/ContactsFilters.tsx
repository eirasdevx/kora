"use client";

import { ContactType } from "@/modules/contacts/contact.types";

type FilterValue = ContactType | "all";

interface Props {
  value: FilterValue;
  onChange: (v: FilterValue) => void;
}

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: "Todos", value: "all" },
  { label: "Socios", value: "member" },
  { label: "Proveedores", value: "provider" },
  { label: "Colaboradores", value: "collaborator" },
  { label: "Otros", value: "other" },
];

export default function ContactsFilters({ value, onChange }: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`px-4 py-2 rounded-full text-sm font-medium border transition
            ${
              value === f.value
                ? "bg-primary text-white border-primary"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
