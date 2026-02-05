import type { ReactNode } from "react";

export default function SettingsDetailLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="w-full">{children}</div>;
}
