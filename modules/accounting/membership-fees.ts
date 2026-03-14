import {
  getContactMembershipPlan,
  type MembershipFeePlan,
  type MembershipBillingCycle,
} from "@/core/session/membership-settings";
import { useSessionStore } from "@/core/session/session.store";
import { Contact } from "@/modules/contacts/contact.types";
import {
  Transaction,
  TransactionStatus,
} from "@/modules/accounting/transaction.types";

export type MembershipFeeCycle = MembershipBillingCycle;

const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export function buildAccountingId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getContactDisplayName(contact: Contact) {
  const composed = `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim();
  return composed || contact.fullName || contact.email || "contacto";
}

export function formatMembershipPeriod(
  date: string,
  cycle: MembershipFeeCycle
) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return cycle === "Anual" ? "ejercicio vigente" : "periodo vigente";
  }
  if (cycle === "Anual") {
    return String(parsed.getFullYear());
  }
  return `${MONTH_NAMES[parsed.getMonth()]} ${parsed.getFullYear()}`;
}

export function buildMembershipConcept(
  plan: Pick<MembershipFeePlan, "name" | "cycle">,
  date: string
) {
  const period = formatMembershipPeriod(date, plan.cycle);
  return `${plan.name} ${period}`;
}

type CreateMembershipTransactionInput = {
  contact: Contact;
  date?: string;
  amount?: number;
  status?: TransactionStatus;
  paymentMethod?: string;
  description?: string;
  createdAt?: string;
  concept?: string;
};

export function createMembershipTransaction({
  contact,
  date,
  amount,
  status = "pending",
  paymentMethod,
  description,
  createdAt,
  concept,
}: CreateMembershipTransactionInput): Transaction {
  const association = useSessionStore.getState().association;
  const plan = getContactMembershipPlan(contact, association);
  const createdStamp = createdAt ?? new Date().toISOString();
  const txDate = date ?? (contact.createdAt || createdStamp).slice(0, 10);
  const displayName = getContactDisplayName(contact);

  return {
    id: buildAccountingId(),
    type: "income",
    amount: amount ?? plan.amount,
    date: txDate,
    concept: concept ?? buildMembershipConcept(plan, txDate),
    description:
      description ??
      `${plan.name} asignada al socio ${displayName}.`,
    category: "membership",
    status,
    contactId: contact.id,
    contactIds: [contact.id],
    membershipPlanId: plan.id,
    membershipPlanName: plan.name,
    paymentMethod: paymentMethod?.trim() || undefined,
    createdAt: createdStamp,
  };
}
