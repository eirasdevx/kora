"use client";

import PageTopbar from "@/components/PageTopbar";

type ModuleTopbarProps = {
  module: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
};

export const moduleTopbarButtonStyles = {
  secondary:
    "rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50",
  primary:
    "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary/90",
};

export default function ModuleTopbar({
  module,
  title,
  description,
  actions,
}: ModuleTopbarProps) {
  return (
    <PageTopbar>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            {module}
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </PageTopbar>
  );
}
