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

function cx(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  backHref,
  backLabel,
}: PageHeaderProps) {
  const hasBackLink = Boolean(backHref && backLabel);
  const headerActions = actions ? (
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
      {actions}
    </div>
  ) : null;

  return (
    <PageTopbar>
      <div className="flex flex-col gap-3">
        {hasBackLink ? (
          <BackLink href={backHref!} label={backLabel!} />
        ) : null}
        <div
          className={cx(
            "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          )}
        >
          <div className="min-w-0">
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
          {headerActions}
        </div>
      </div>
    </PageTopbar>
  );
}
