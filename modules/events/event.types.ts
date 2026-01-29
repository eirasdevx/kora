export interface Event {
  id: string;
  title: string;
  description?: string;
  startDate: string; // ISO
  endDate?: string;
  location?: string;

  participantIds: string[];
  organizerIds: string[];

  createdAt: string;
}
