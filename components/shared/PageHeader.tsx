"use client";

import PageTopbar from "@/components/PageTopbar";
import BackLink from "@/components/shared/BackLink";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
};

export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  backHref,
  backLabel,
}: PageHeaderProps) {
  return (
    <PageTopbar>
      {backHref && backLabel ? (
        <div className="mb-4">
          <BackLink href={backHref} label={backLabel} />
        </div>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-2xl font-semibold text-gray-900">
            {title}
          </h1>
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
    </PageTopbar>
  );
}
