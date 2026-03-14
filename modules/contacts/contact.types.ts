export type ContactType =
  | "member"
  | "provider"
  | "collaborator"
  | "sponsor"
  | "other";

export type ContactKind = "person" | "entity";

export interface ContactPrivacyPermissions {
  image: boolean;
  voice: boolean;
  communications: boolean;
  services: boolean;
}

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
  membershipPlanId?: string;
  accountingAccountType?: ContactType;
  accountingAccountCode?: string;
  accountingAccountLabel?: string;
  privacyPermissions?: ContactPrivacyPermissions;
  privacyUpdatedAt?: string;
  consentDocumentIds?: string[];
  tags?: string[];
  notes?: string;
  createdAt: string;
  deactivatedAt?: string;
}

export const ContactTypeLabels: Record<ContactType, string> = {
  member: "Socio",
  provider: "Proveedor",
  collaborator: "Colaborador",
  sponsor: "Patrocinador",
  other: "Otro",
};

export const ContactKindLabels: Record<ContactKind, string> = {
  person: "Persona",
  entity: "Entidad",
};
