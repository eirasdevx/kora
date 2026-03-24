"use client";

import PageHeader from "@/components/shared/PageHeader";

type SettingsPageHeaderProps = {
  title: string;
  subtitle: string;
  section?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
};

export default function SettingsPageHeader({
  title,
  subtitle,
  actions,
  backHref = "/settings",
  backLabel = "Volver a configuraci\u00f3n",
}: SettingsPageHeaderProps) {
  return (
    <PageHeader
      title={title}
      subtitle={subtitle}
      backHref={backHref}
      backLabel={backLabel}
      actions={actions}
    />
  );
}
