import type { SortDirection } from "@/lib/table-sorting";
import Icon from "@/components/shared/Icon";

interface SortableHeaderProps {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  className?: string;
  align?: "left" | "right";
}

export default function SortableHeader({
  label,
  active,
  direction,
  onClick,
  className,
  align = "left",
}: SortableHeaderProps) {
  const buttonAlignment =
    align === "right" ? "justify-end text-right" : "justify-start text-left";
  const iconName = active
    ? direction === "asc"
      ? "north"
      : "south"
    : "unfold_more";

  return (
    <th className={className}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex w-full items-center gap-1 transition hover:text-gray-600 ${buttonAlignment} ${
          active ? "text-gray-600" : "text-gray-400"
        }`}
      >
        <span>{label}</span>
        <Icon
          name={iconName}
          className={`text-[16px] ${
            active ? "opacity-100" : "opacity-50"
          }`}
        />
      </button>
    </th>
  );
}
