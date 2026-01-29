import Dexie, { Table } from "dexie";
import { Contact } from "@/modules/contacts/contact.types";

export class KoraDB extends Dexie {
  contacts!: Table<Contact, string>;

  constructor() {
    super("kora-db");

    this.version(1).stores({
      contacts: "id, fullName, createdAt",
    });
  }
}

export const db = new KoraDB();
