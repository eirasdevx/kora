import Dexie, { Table } from "dexie";
import { Contact } from "@/modules/contacts/contact.types";
import { Event } from "@/modules/events/event.types";
import { Transaction } from "@/modules/accounting/transaction.types";
import { SocialPost } from "@/modules/social/social.types";
import { DocumentItem } from "@/modules/documents/document.types";

export class KoraDB extends Dexie {
  contacts!: Table<Contact, string>;
  events!: Table<Event, string>;
  transactions!: Table<Transaction, string>;
  socialPosts!: Table<SocialPost, string>;
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
      socialPosts: "id, status, createdAt, scheduledAt",
    });

    this.version(3).stores({
      contacts: "id, fullName, createdAt",
      events: "id, title, startDate, createdAt",
      transactions: "id, concept, date, createdAt",
      socialPosts: "id, status, createdAt, scheduledAt",
      documents: "id, name, createdAt, updatedAt, type, category, security",
    });
  }
}

export const db = new KoraDB();
