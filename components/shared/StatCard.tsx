"use client";

import Link from "next/link";
import Icon from "@/components/shared/Icon";

type StatCardProps = {
  title: string;
  value: string;
  meta?: string;
  href?: string;
  icon?: string;
  accentClassName?: string;
  footer?: React.ReactNode;
  className?: string;
};

function cx(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export default function StatCard({
  title,
  value,
  meta,
  href,
  icon,
  accentClassName,
  footer,
  className,
}: StatCardProps) {
  const content = (
    <div
      className={cx(
        "relative h-full rounded-3xl border border-gray-200 bg-white p-5 shadow-sm",
        className,
        href &&
          "transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {value}
          </p>
        </div>
        {icon ? (
          <span
            className={cx(
              "flex h-10 w-10 items-center justify-center rounded-2xl text-[18px]",
              accentClassName ?? "bg-primary/10 text-primary"
            )}
          >
            <Icon name={icon} className="text-[18px]" />
          </span>
        ) : null}
      </div>
      {meta ? (
        <p className="mt-2 text-xs text-gray-500">{meta}</p>
      ) : null}
      {footer ? <div className="mt-4">{footer}</div> : null}
      {href ? (
        <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">
          Ver detalle
          <Icon name="arrow_forward" className="text-[14px]" />
        </div>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
}
