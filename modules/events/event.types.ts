export type EventStatus = "draft" | "published";

export interface Event {
  id: string;
  title: string;
  description?: string;
  category?: string;
  status?: EventStatus;
  startDate: string; // ISO
  endDate?: string;
  location?: string;
  locationType?: "onsite" | "online";

  ticketPrice?: number;
  capacity?: number;
  registrationDeadline?: string;
  waitlistEnabled?: boolean;
  participantIds: string[];
  organizerIds: string[];

  createdAt: string;
}
