"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import ContactForm from "@/modules/contacts/ContactForm";
import { useContactsStore } from "@/modules/contacts/contacts.store";

export default function EditContactPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { contacts, loadContacts, addContact } =
    useContactsStore();

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const contactId =
    typeof params.id === "string" ? params.id : params.id?.[0];

  const contact = useMemo(
    () => contacts.find((c) => c.id === contactId),
    [contacts, contactId]
  );

  if (!contact) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500">
        Cargando contacto...
      </div>
    );
  }

  return (
    <ContactForm
      initialData={contact}
      onSubmit={async (updated) => {
        await addContact(updated);
        router.push("/contacts");
      }}
      onCancel={() => router.push("/contacts")}
    />
  );
}
