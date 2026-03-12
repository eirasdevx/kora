"use client";

import ClientRedirect from "@/components/shared/ClientRedirect";

export default function NotificationsPage() {
  return (
    <ClientRedirect
      to="/settings/notifications"
      label="Redirigiendo al centro de notificaciones..."
    />
  );
}
