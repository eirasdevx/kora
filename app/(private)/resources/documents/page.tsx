"use client";

import ClientRedirect from "@/components/shared/ClientRedirect";

export default function ResourcesDocumentsPage() {
  return (
    <ClientRedirect
      to="/documents"
      label="Redirigiendo al generador documental..."
    />
  );
}
