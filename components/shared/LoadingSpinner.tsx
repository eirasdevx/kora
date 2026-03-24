"use client";

type LoadingSpinnerProps = {
  label?: string;
  description?: string;
  overlay?: boolean;
  fullHeight?: boolean;
  className?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function LoadingSpinner({
  label = "Cargando...",
  description,
  overlay = false,
  fullHeight = false,
  className,
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(
        overlay
          ? "absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-white/75 px-6 py-8 backdrop-blur-[1px]"
          : "flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-10 shadow-sm",
        fullHeight && !overlay ? "min-h-[260px]" : undefined,
        className
      )}
    >
      <div className="flex max-w-sm flex-col items-center text-center">
        <span className="inline-flex h-12 w-12 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
        <p className="mt-4 text-sm font-semibold text-slate-900">{label}</p>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
