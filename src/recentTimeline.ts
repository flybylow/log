/** In-memory chronological list of accepted events (for / and /api/timeline). */

export interface TimelineEntry {
  receivedAt: string;
  eventTime: string;
  bizStep: string | null;
  type: string;
  hash: string;
  /** RDF subject URI for this event (same as in GET /graph). */
  eventUri: string;
  classification: string;
  epcFirst: string | null;
  triplesAdded: number;
}

const MAX = 500;
const entries: TimelineEntry[] = [];

export function pushTimelineEntry(e: TimelineEntry): void {
  entries.push(e);
  while (entries.length > MAX) entries.shift();
}

/** Oldest → newest (lineaire volgorde). */
export function getTimeline(): TimelineEntry[] {
  return [...entries];
}

export function resetTimelineForTests(): void {
  entries.length = 0;
}
