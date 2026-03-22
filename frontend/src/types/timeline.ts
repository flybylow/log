/** Mirrors server `TimelineEntry` from /api/timeline */

export type TimelineEntry = {
  receivedAt: string;
  eventTime: string;
  bizStep: string | null;
  type: string;
  hash: string;
  classification: string;
  epcFirst: string | null;
  triplesAdded: number;
};
