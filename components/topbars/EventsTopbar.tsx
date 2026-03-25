"use client";

import {
  moduleTopbarButtonIconStyles,
  moduleTopbarButtonStyles,
} from "@/components/shared/ModuleTopbar";
import Icon from "@/components/shared/Icon";

export type EventsView = "month" | "week" | "day";

interface Props {
  onCreate: () => void;
}

export default function EventsTopbar({
  onCreate,
}: Props) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-gray-900">
          Agenda de Eventos
        </h1>
      </div>

      <button
        onClick={onCreate}
        className={moduleTopbarButtonStyles.primary}
      >
        <span className={moduleTopbarButtonIconStyles.add}>
          <Icon name="add" className="text-[16px]" />
        </span>
        Crear Nuevo Evento
      </button>
    </div>
  );
}
