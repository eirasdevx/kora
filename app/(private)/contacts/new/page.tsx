"use client";

import { useRouter } from "next/navigation";
import ContactForm from "@/modules/contacts/ContactForm";
import { useContactsStore } from "@/modules/contacts/contacts.store";

export default function NewContactPage() {
  const router = useRouter();
  const addContact = useContactsStore((s) => s.addContact);

  return (
    <ContactForm
      onSubmit={async (contact) => {
        await addContact(contact);
        router.push("/contacts");
      }}
      onCancel={() => router.push("/contacts")}
    />
  );
}
