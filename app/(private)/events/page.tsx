"use client";

import { useEffect, useMemo, useState } from "react";
import MonthlyCalendar from "@/components/events/MonthlyCalendar";
import EventDetailsPanel from "@/components/events/EventDetailsPanel";
import Modal from "@/components/Modal";
import EventsTopbar, { EventsView } from "@/components/topbars/EventsTopbar";

import { Event } from "@/modules/events/event.types";
import { useEventsStore } from "@/modules/events/events.store";
import EventForm from "@/modules/events/EventForm";

import { useContactsStore } from "@/modules/contacts/contacts.store";

export default function EventsPage() {
  const { events, loadEvents, addOrUpdateEvent } = useEventsStore();
  const loadContacts = useContactsStore((s) => s.loadContacts);

  useEffect(() => {
    loadEvents();
    loadContacts(); // <-- IMPORTANTÍSIMO para que haya contactos en Eventos
  }, [loadEvents, loadContacts]);

  const [view, setView] = useState<EventsView>("month");
  const [search, setSearch] = useState("");

  // ✅ En vez de guardar el objeto, guardamos el ID
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const selectedEvent = useMemo<Event | null>(() => {
    if (!selectedEventId) return null;
    return events.find((e) => e.id === selectedEventId) ?? null;
  }, [events, selectedEventId]);

  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const editingEvent = useMemo<Event | null>(() => {
    if (!editingEventId) return null;
    return events.find((e) => e.id === editingEventId) ?? null;
  }, [events, editingEventId]);

  const [showForm, setShowForm] = useState(false);

  const [date, setDate] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => e.title.toLowerCase().includes(q));
  }, [events, search]);

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-6">
        <EventsTopbar
          view={view}
          onChangeView={setView}
          onSearch={setSearch}
          onCreate={() => {
            setEditingEventId(null);
            setShowForm(true);
          }}
        />

        {view === "month" && (
          <MonthlyCalendar
            year={date.year}
            month={date.month}
            events={filteredEvents}
            selectedEventId={selectedEventId ?? undefined}
            onSelectEvent={(e) => setSelectedEventId(e.id)}
            onPrevMonth={() =>
              setDate((d) =>
                d.month === 0 ? { year: d.year - 1, month: 11 } : { ...d, month: d.month - 1 }
              )
            }
            onNextMonth={() =>
              setDate((d) =>
                d.month === 11 ? { year: d.year + 1, month: 0 } : { ...d, month: d.month + 1 }
              )
            }
          />
        )}
      </div>

      {selectedEvent && (
        <EventDetailsPanel
          event={selectedEvent}
          onClose={() => setSelectedEventId(null)}
          onEdit={(e) => {
            setEditingEventId(e.id);
            setShowForm(true);
          }}
        />
      )}

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingEventId(null);
        }}
        title={editingEvent ? "Editar evento" : "Nuevo evento"}
      >
        <EventForm
          key={editingEvent?.id ?? "new"}
          initialData={editingEvent ?? undefined}
          onSubmit={(ev) => {
            addOrUpdateEvent(ev);
            setShowForm(false);
            setEditingEventId(null);
            // Si acabas de crear, lo seleccionamos automáticamente
            setSelectedEventId(ev.id);
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingEventId(null);
          }}
        />
      </Modal>
    </div>
  );
}
