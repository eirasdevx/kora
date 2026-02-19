export type ContactType =
  | "member"
  | "provider"
  | "collaborator";

export type ContactKind = "person" | "entity";

export interface Contact {
  id: string;
  kind: ContactKind;
  firstName: string;
  lastName: string;
  dni: string;
  fullName?: string;
  representativeFirstName?: string;
  representativeLastName?: string;
  email?: string;
  phone?: string;
  secondaryPhone?: string;
  website?: string;
  postalCode?: string;
  address?: string;
  city?: string;
  region?: string;
  birthDate?: string;
  photoUrl?: string;
  types: ContactType[];
  tags?: string[];
  notes?: string;
  createdAt: string;
  deactivatedAt?: string;
}

export const ContactTypeLabels: Record<ContactType, string> = {
  member: "Socio",
  provider: "Proveedor",
  collaborator: "Colaborador",
};

export const ContactKindLabels: Record<ContactKind, string> = {
  person: "Persona",
  entity: "Entidad",
};
