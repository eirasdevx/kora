"use client";

import Link from "next/link";
import Icon from "@/components/shared/Icon";

type BackLinkProps = {
  href: string;
  label: string;
  className?: string;
};

function cx(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export default function BackLink({
  href,
  label,
  className,
}: BackLinkProps) {
  return (
    <Link
      href={href}
      className={cx(
        "group inline-grid h-5 max-w-full grid-cols-[16px_minmax(0,1fr)] items-center gap-2 align-middle text-xs font-semibold uppercase tracking-[0.16em] text-gray-400 transition hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/15 focus:ring-offset-2",
        className
      )}
      aria-label={label}
    >
      <span className="flex h-5 w-4 items-center justify-center">
        <Icon
          name="chevron_left"
          variant="rounded"
          className="-translate-y-px text-[18px] transition-transform duration-200 group-hover:-translate-x-0.5"
        />
      </span>
      <span className="inline-flex min-w-0 items-center truncate leading-none">
        {label}
      </span>
    </Link>
  );
}
