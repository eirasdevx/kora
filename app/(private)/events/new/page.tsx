"use client";

import { useRouter } from "next/navigation";
import { useEventsStore } from "@/modules/events/events.store";
import EventForm from "@/modules/events/EventForm";

export default function NewEventPage() {
  const router = useRouter();
  const addOrUpdateEvent = useEventsStore(
    (s) => s.addOrUpdateEvent
  );

  return (
    <EventForm
      onSubmit={async (event) => {
        await addOrUpdateEvent(event);
        router.push("/events");
      }}
      onCancel={() => router.push("/events")}
    />
  );
}
