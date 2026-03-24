"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ContactForm from "@/modules/contacts/ContactForm";
import { useContactsStore } from "@/modules/contacts/contacts.store";

export default function EditContactPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const isLoading = useContactsStore((state) => state.isLoading);
  const { contacts, loadContacts, addContact } =
    useContactsStore();

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  const contactId =
    typeof params.id === "string" ? params.id : params.id?.[0];

  const contact = useMemo(
    () => contacts.find((c) => c.id === contactId),
    [contacts, contactId]
  );
  const requestedReturnTo = searchParams.get("returnTo");
  const returnTo =
    requestedReturnTo && requestedReturnTo.startsWith("/")
      ? requestedReturnTo
      : "/people/all";

  if (!contact) {
    if (isLoading) {
      return (
        <LoadingSpinner
          fullHeight
          label="Cargando contacto..."
          description="La ficha estara disponible en cuanto termine la carga."
        />
      );
    }

    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500">
        No se encontro el contacto solicitado.
      </div>
    );
  }

  return (
    <ContactForm
      backHref={returnTo}
      backLabel="Volver a Personas"
      initialData={contact}
      onSubmit={async (updated) => {
        await addContact(updated);
        router.push(returnTo);
      }}
      onCancel={() => router.push(returnTo)}
    />
  );
}
