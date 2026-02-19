import Dexie, { Table } from "dexie";
import { Contact } from "@/modules/contacts/contact.types";
import { Event } from "@/modules/events/event.types";
import { Transaction } from "@/modules/accounting/transaction.types";
import { DocumentItem } from "@/modules/documents/document.types";

export class KoraDB extends Dexie {
  contacts!: Table<Contact, string>;
  events!: Table<Event, string>;
  transactions!: Table<Transaction, string>;
  documents!: Table<DocumentItem, string>;

  constructor() {
    super("kora-db");

    this.version(1).stores({
      contacts: "id, fullName, createdAt",
    });

    this.version(2).stores({
      contacts: "id, fullName, createdAt",
      events: "id, title, startDate, createdAt",
      transactions: "id, concept, date, createdAt",
      documents: "id, name, createdAt, updatedAt, type, category, security",
    });

    this.version(4).stores({
      contacts: "id, fullName, createdAt",
      events: "id, title, startDate, createdAt",
      transactions: "id, concept, date, createdAt",
      documents: "id, name, createdAt, updatedAt, type, category, security",
    });
  }
}

export const db = new KoraDB();

export const resetKoraData = async () => {
  await db.transaction("rw", db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });
};
