"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useEventsStore } from "@/modules/events/events.store";
import EventForm from "@/modules/events/EventForm";

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { events, loadEvents, addOrUpdateEvent } =
    useEventsStore();

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const eventId =
    typeof params.id === "string" ? params.id : params.id?.[0];

  const event = useMemo(
    () => events.find((e) => e.id === eventId),
    [events, eventId]
  );

  if (!event) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500">
        Cargando evento...
      </div>
    );
  }

  return (
    <EventForm
      backHref="/events"
      backLabel="Volver a Eventos"
      initialData={event}
      onSubmit={async (updated) => {
        await addOrUpdateEvent(updated);
        router.push("/events");
      }}
      onCancel={() => router.push("/events")}
    />
  );
}
