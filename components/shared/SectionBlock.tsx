"use client";

type SectionBlockProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

function cx(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export default function SectionBlock({
  title,
  subtitle,
  actions,
  className,
  children,
}: SectionBlockProps) {
  return (
    <section
      className={cx(
        "rounded-3xl border border-gray-200 bg-white p-6 shadow-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-sm text-gray-500">{subtitle}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
