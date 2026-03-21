export type VolunteerProfileType = "member" | "contact";

export interface VolunteerActivity {
  id: string;
  associationId?: string;
  contactId: string;
  profileType: VolunteerProfileType;
  date: string;
  hours: number;
  eventId?: string;
  notes?: string;
  createdAt: string;
}
