"use client";

interface Props {
  onAdd: () => void;
}

export default function ContactsHeader({ onAdd }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de contactos
          </h1>
          <p className="text-gray-500">
            Administra los miembros, proveedores y colaboradores
            de tu asociación.
          </p>
        </div>

        <button
          onClick={onAdd}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </span>
          Nuevo contacto
        </button>
      </div>
    </div>
  );
}
