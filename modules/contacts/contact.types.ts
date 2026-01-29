export type ContactType =
  | "member"
  | "provider"
  | "collaborator"
  | "other";

export interface Contact {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  types: ContactType[];
  tags?: string[];
  notes?: string;
  createdAt: string;
}

export const ContactTypeLabels: Record<ContactType, string> = {
  member: "Socio",
  provider: "Proveedor",
  collaborator: "Colaborador",
  other: "Otro",
};