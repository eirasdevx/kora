type IconVariant = "outlined" | "rounded";

type IconProps = {
  name: string;
  className?: string;
  label?: string;
  variant?: IconVariant;
};

function cx(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export default function Icon({
  name,
  className,
  label,
  variant = "outlined",
}: IconProps) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      className={cx(
        variant === "rounded"
          ? "material-symbols-rounded"
          : "material-symbols-outlined",
        "icon-symbol",
        className
      )}
    >
      {name}
    </span>
  );
}
