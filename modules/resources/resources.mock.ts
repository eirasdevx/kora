import { InventoryItem } from "@/modules/resources/inventory.types";

export type LoanRecord = {
  id: string;
  item: string;
  borrower: string;
  dueDate: string;
  status: "active" | "overdue" | "returned";
};

export const INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: "inv-1",
    name: "Proyector Epson",
    category: "Audiovisual",
    quantity: 4,
    borrowed: 1,
    status: "in_use",
    createdAt: "2026-01-20",
  },
  {
    id: "inv-2",
    name: "Sillas plegables",
    category: "Mobiliario",
    quantity: 80,
    borrowed: 12,
    status: "available",
    createdAt: "2026-01-18",
  },
  {
    id: "inv-3",
    name: "Carpas modulares",
    category: "Logística",
    quantity: 6,
    borrowed: 2,
    status: "in_use",
    createdAt: "2026-02-02",
  },
  {
    id: "inv-4",
    name: "Tablets",
    category: "Tecnología",
    quantity: 10,
    borrowed: 4,
    status: "available",
    createdAt: "2026-02-10",
  },
];

export const RECENT_LOANS: LoanRecord[] = [
  {
    id: "loan-1",
    item: "Proyector Epson",
    borrower: "Equipo Eventos",
    dueDate: "2026-02-28",
    status: "active",
  },
  {
    id: "loan-2",
    item: "Carpas modulares",
    borrower: "Comisión Cultura",
    dueDate: "2026-02-22",
    status: "overdue",
  },
  {
    id: "loan-3",
    item: "Tablets",
    borrower: "Área Formación",
    dueDate: "2026-03-04",
    status: "active",
  },
  {
    id: "loan-4",
    item: "Sillas plegables",
    borrower: "Equipo Logística",
    dueDate: "2026-02-18",
    status: "returned",
  },
];
