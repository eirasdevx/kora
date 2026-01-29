"use client";

interface Props {
  onAdd: () => void;
  onSearch: (value: string) => void;
}

export default function ContactsHeader({ onAdd, onSearch }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Directorio de Contactos
          </h1>
          <p className="text-gray-500">
            Socios, proveedores, colaboradores y otros
          </p>
        </div>

        <button
          onClick={onAdd}
          className="bg-primary text-white px-4 py-2 rounded-lg font-semibold"
        >
          + Nuevo contacto
        </button>
      </div>

      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          onChange={(e) => onSearch(e.target.value)}
          className="w-full border rounded-lg pl-10 pr-4 py-2 text-sm"
        />
        <span className="absolute left-3 top-2.5 text-gray-400">
          🔍
        </span>
      </div>
    </div>
  );
}
