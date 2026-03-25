"use client";

import {
  moduleTopbarButtonIconStyles,
  moduleTopbarButtonStyles,
} from "@/components/shared/ModuleTopbar";
import Icon from "@/components/shared/Icon";

interface Props {
  onAdd: () => void;
}

export default function ContactsHeader({ onAdd }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Gestión de contactos
          </h1>
          <p className="text-sm text-gray-500">
            Administra los miembros, proveedores y colaboradores de tu asociación.
          </p>
        </div>

        <button
          onClick={onAdd}
          className={moduleTopbarButtonStyles.primary}
        >
          <span className={moduleTopbarButtonIconStyles.add}>
            <Icon name="add" className="text-[16px]" />
          </span>
          Nuevo contacto
        </button>
      </div>
    </div>
  );
}
