"use client";

import Link from "next/link";

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
        "inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50",
        className
      )}
    >
      <span className="material-symbols-outlined text-[16px]">
        arrow_back
      </span>
      {label}
    </Link>
  );
}
