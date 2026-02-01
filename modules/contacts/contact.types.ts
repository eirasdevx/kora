export type ContactType =
  | "member"
  | "provider"
  | "collaborator";

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
  fullName?: string;
  email?: string;
  phone?: string;
  secondaryPhone?: string;
  website?: string;
  socialLinks?: string;
  postalCode?: string;
  address?: string;
  city?: string;
  region?: string;
  photoUrl?: string;
  types: ContactType[];
  tags?: string[];
  notes?: string;
  createdAt: string;
}

export const ContactTypeLabels: Record<ContactType, string> = {
  member: "Socio",
  provider: "Proveedor",
  collaborator: "Colaborador",
};
