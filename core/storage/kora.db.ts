import Dexie, { Table } from "dexie";
import { Contact } from "@/modules/contacts/contact.types";
import { Event } from "@/modules/events/event.types";
import { Transaction } from "@/modules/accounting/transaction.types";
import { DocumentItem } from "@/modules/documents/document.types";
import { VolunteerActivity } from "@/modules/volunteers/volunteer-activity.types";
import { InventoryItem } from "@/modules/resources/inventory.types";

export class KoraDB extends Dexie {
  contacts!: Table<Contact, string>;
  events!: Table<Event, string>;
  transactions!: Table<Transaction, string>;
  documents!: Table<DocumentItem, string>;
  volunteerActivities!: Table<VolunteerActivity, string>;
  inventory!: Table<InventoryItem, string>;

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

    this.version(5).stores({
      contacts: "id, fullName, createdAt",
      events: "id, title, startDate, createdAt",
      transactions: "id, concept, date, createdAt",
      documents: "id, name, createdAt, updatedAt, type, category, security",
      volunteerActivities: "id, contactId, date, createdAt",
    });

    this.version(6).stores({
      contacts: "id, fullName, createdAt",
      events: "id, title, startDate, createdAt",
      transactions: "id, concept, date, createdAt",
      documents: "id, name, createdAt, updatedAt, type, category, security",
      volunteerActivities: "id, contactId, date, createdAt",
      inventory: "id, name, category, createdAt, status",
    });
  }
}

export const db = new KoraDB();

export const resetKoraData = async () => {
  await db.transaction("rw", db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });
};
