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
    "group inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto sm:min-w-[158px]",
  primary:
    "group inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-primary px-3.5 text-sm font-semibold text-white shadow transition hover:bg-primary/90 sm:w-auto sm:min-w-[158px]",
};

export const moduleTopbarButtonIconStyles = {
  secondary:
    "flex h-4 w-4 shrink-0 items-center justify-center text-slate-500 transition group-hover:text-primary",
  primary:
    "flex h-4 w-4 shrink-0 items-center justify-center text-white transition",
  add:
    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/10 transition group-hover:bg-white/20",
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
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </PageTopbar>
  );
}
