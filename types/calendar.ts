/**
 * Booking confirmation status of calendar events.
 */
export enum CalendarEventStatus {
  CONFIRMED = 'confirmed',
  TENTATIVE = 'tentative',
  CANCELLED = 'cancelled',
}

/**
 * Origin source of the calendar event.
 */
export enum CalendarSource {
  LOCAL = 'local',
  GOOGLE = 'google',
  OUTLOOK = 'outlook',
}

/**
 * Calendar Event model representation in Firestore.
 */
export interface CalendarEvent {
  /** Unique identifier of the event */
  id: string;
  /** ID of the user who owns this event */
  userId: string;
  /** Primary label/title of the event */
  title: string;
  /** Optional notes or event details */
  description: string | null;
  /** Event start timestamp (ISO Date string, e.g. "2026-06-27T10:00:00Z") */
  startTime: string;
  /** Event end timestamp (ISO Date string, e.g. "2026-06-27T11:00:00Z") */
  endTime: string;
  /** Flag representing if the event spans the entire day */
  isAllDay: boolean;
  /** Optional location address or meeting link URL */
  location: string | null;
  /** Booking state */
  status: CalendarEventStatus;
  /** Optional RFC 5545 recurrence rule string for repeating events (e.g. "FREQ=DAILY;COUNT=10") */
  recurrenceRule: string | null;
  /** Origin source of the event integration */
  source: CalendarSource;
  /** ID of the event inside Google/Outlook if synced from third-party provider */
  externalEventId: string | null;
  /** Optional task associated with this specific event block */
  taskId: string | null;
  /** ISO Date string when the event record was created */
  createdAt: string;
  /** ISO Date string when the event record was last updated */
  updatedAt: string;
}
