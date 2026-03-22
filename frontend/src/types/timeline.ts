/** Mirrors server `TimelineEntry` from /api/timeline */

export type TimelineEntry = {
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
};
