"use client";

import { useRouter } from "next/navigation";
import ContactForm from "@/modules/contacts/ContactForm";
import { useContactsStore } from "@/modules/contacts/contacts.store";

export default function NewContactPage() {
  const router = useRouter();
  const addContact = useContactsStore((s) => s.addContact);

  return (
    <ContactForm
      backHref="/people/all"
      backLabel="Volver a Personas"
      onSubmit={async (contact) => {
        await addContact(contact);
        router.push("/people/all");
      }}
      onCancel={() => router.push("/people/all")}
    />
  );
}
