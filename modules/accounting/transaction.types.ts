export type TransactionType = "income" | "expense";

export type TransactionStatus = "completed" | "pending";

export type TransactionCategory =
  | "membership"
  | "installations"
  | "events"
  | "subsidies"
  | "other";

export interface Transaction {
  id: string;

  type: TransactionType;          // ingreso | gasto
  amount: number;                 // siempre positivo
  date: string;                   // ISO date (yyyy-mm-dd)

  concept: string;                // título principal
  description?: string;           // texto secundario
  paymentMethod?: string;

  category: TransactionCategory;
  status: TransactionStatus;

  eventId?: string;               // opcional
  contactId?: string;
  contactIds?: string[];
  attachments?: File[];

  createdAt: string;
}

/* =======================
   Labels para UI
======================= */

export const TransactionCategoryLabels: Record<
  TransactionCategory,
  string
> = {
  membership: "Membresía",
  installations: "Instalaciones",
  events: "Eventos",
  subsidies: "Subvenciones",
  other: "Otros",
};

export const TransactionStatusLabels: Record<
  TransactionStatus,
  string
> = {
  completed: "Completado",
  pending: "Pendiente",
};
