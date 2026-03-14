"use client";

import ClientRedirect from "@/components/shared/ClientRedirect";

export default function FinanceFeesPage() {
  return (
    <ClientRedirect
      to="/accounting/fees"
      label="Redirigiendo a cuotas..."
    />
  );
}
