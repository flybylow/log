/** Construction-vertical EPCIS JSON-LD samples for the Send EPCIS dropdown (aligned with `src/validate.ts` bizStep list). */

const CTX = ["https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld"];

function mk(
  bizStep: string,
  scenarioLabel: string,
  eventTime: string,
  action: string,
  extra?: Record<string, unknown>
): string {
  return JSON.stringify(
    {
      "@context": CTX,
      type: "ObjectEvent",
      eventTime,
      action,
      bizStep,
      epcList: ["https://id.gs1.org/01/05413456000012/21/DEMO-ASSET-001"],
      readPoint: { id: "https://id.gs1.org/414/0541345600001" },
      bizLocation: { id: "https://id.gs1.org/414/0541345600002" },
      actor: "Demo Construction BV",
      "dpp:scenarioLabel": scenarioLabel,
      ...extra,
    },
    null,
    2
  );
}

/** Order matches the product dropdown (construction lifecycle). */
export const SAMPLE_ORDER = [
  "designing",
  "permitting",
  "specifying",
  "ordering",
  "manufacturing",
  "certifying",
  "storing",
  "shipping",
  "receiving",
  "installing",
  "inspecting",
  "commissioning",
  "occupying",
  "maintaining",
  "repairing",
  "replacing",
  "renovating",
  "decommissioning",
  "recycling",
  "destroying",
  "recovering",
] as const;

export type EmbeddedSampleKey = (typeof SAMPLE_ORDER)[number];

export const SAMPLE_LABELS: Record<EmbeddedSampleKey, string> = {
  designing: "Building designed (BIM/IFC created)",
  permitting: "Building permitted",
  specifying: "Product specified (architect selects ETIM class)",
  ordering: "Product ordered",
  manufacturing: "Product manufactured",
  certifying: "Product certified (CE, ETIM, EPD)",
  storing: "Product stored (warehouse)",
  shipping: "Product shipped",
  receiving: "Product received (site)",
  installing: "Product installed",
  inspecting: "Installation inspected",
  commissioning: "Building commissioned (systems tested)",
  occupying: "Occupancy permitted",
  maintaining: "Product maintained",
  repairing: "Product repaired",
  replacing: "Product replaced",
  renovating: "Building renovated",
  decommissioning: "Product decommissioned (removed)",
  recycling: "Product recycled",
  destroying: "Building demolished",
  recovering: "Materials recovered",
};

/** Rich Van Marcke examples for key construction steps (kept from original demos). */
const VANMARCKE_COMMISSIONING = `{
  "@context": ["https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld"],
  "type": "ObjectEvent",
  "eventTime": "2026-03-22T09:00:00Z",
  "action": "ADD",
  "bizStep": "commissioning",
  "epcList": ["https://id.gs1.org/01/05413456000012/21/ARBLU-IDS-001"],
  "readPoint": { "id": "https://id.gs1.org/414/0541345600001" },
  "bizLocation": { "id": "https://id.gs1.org/414/0541345600002" },
  "actor": "Van Marcke Group NV",
  "certification": "ETIM EC011431",
  "dpp:etimClass": "EC011431",
  "dpp:etimClassDescription": "Inloopdouche",
  "dpp:brand": "Arblu",
  "dpp:model": "Ideo Screen",
  "dpp:scenarioLabel": "Building commissioned (systems tested)"
}`;

const VANMARCKE_SHIPPING = `{
  "@context": ["https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld"],
  "type": "ObjectEvent",
  "eventTime": "2026-03-22T14:30:00Z",
  "action": "OBSERVE",
  "bizStep": "shipping",
  "epcList": ["https://id.gs1.org/01/05413456000029/21/GROHE-EH-042"],
  "readPoint": { "id": "https://id.gs1.org/414/0541345600003" },
  "bizLocation": { "id": "https://id.gs1.org/414/0541345600004" },
  "disposition": "in_transit",
  "actor": "Van Marcke Logistics",
  "dpp:etimClass": "EC011431",
  "dpp:brand": "Grohe",
  "dpp:model": "Eurosmart",
  "dpp:destination": "Installateur Janssens BVBA",
  "dpp:scenarioLabel": "Product shipped"
}`;

const VANMARCKE_INSTALLING = `{
  "@context": ["https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld"],
  "type": "ObjectEvent",
  "eventTime": "2026-03-25T11:00:00Z",
  "action": "OBSERVE",
  "bizStep": "installing",
  "epcList": ["https://id.gs1.org/01/05413456000029/21/GROHE-EH-042"],
  "readPoint": { "id": "https://id.gs1.org/414/0541345600005" },
  "bizLocation": { "id": "https://id.gs1.org/414/0541345600006" },
  "actor": "Installateur Janssens BVBA",
  "dpp:project": "Nieuwbouw Residentie Groen",
  "dpp:location": "Unit 3B, Badkamer",
  "dpp:installerCertification": "Cerga G1",
  "dpp:scenarioLabel": "Product installed"
}`;

export const SAMPLE_PAYLOADS: Record<EmbeddedSampleKey, string> = {
  designing: mk("designing", SAMPLE_LABELS.designing, "2026-01-01T08:00:00.000Z", "ADD", {
    "dpp:bimPhase": "IFC design freeze",
  }),
  permitting: mk("permitting", SAMPLE_LABELS.permitting, "2026-01-15T10:00:00.000Z", "OBSERVE", {
    "dpp:permitId": "URB-2026-0042",
  }),
  specifying: mk("specifying", SAMPLE_LABELS.specifying, "2026-01-20T11:30:00.000Z", "OBSERVE", {
    "dpp:etimClass": "EC011431",
    "dpp:etimClassDescription": "Shower enclosure",
  }),
  ordering: mk("ordering", SAMPLE_LABELS.ordering, "2026-02-01T09:00:00.000Z", "ADD", {
    "dpp:orderRef": "PO-77821",
  }),
  manufacturing: mk("manufacturing", SAMPLE_LABELS.manufacturing, "2026-02-10T07:00:00.000Z", "ADD"),
  certifying: mk("certifying", SAMPLE_LABELS.certifying, "2026-02-18T14:00:00.000Z", "OBSERVE", {
    certification: "CE + ETIM + EPD bundle",
    "dpp:epdUri": "https://example.org/epd/demo-001",
  }),
  storing: mk("storing", SAMPLE_LABELS.storing, "2026-02-20T16:00:00.000Z", "OBSERVE", {
    disposition: "sellable",
  }),
  shipping: VANMARCKE_SHIPPING,
  receiving: mk("receiving", SAMPLE_LABELS.receiving, "2026-03-23T08:00:00.000Z", "OBSERVE", {
    "dpp:siteGate": "Gate B",
  }),
  installing: VANMARCKE_INSTALLING,
  inspecting: mk("inspecting", SAMPLE_LABELS.inspecting, "2026-03-26T15:00:00.000Z", "OBSERVE", {
    "dpp:inspectionOutcome": "passed",
  }),
  commissioning: VANMARCKE_COMMISSIONING,
  occupying: mk("occupying", SAMPLE_LABELS.occupying, "2026-04-01T12:00:00.000Z", "OBSERVE", {
    "dpp:occupancyCertificate": "OC-2026-09",
  }),
  maintaining: mk("maintaining", SAMPLE_LABELS.maintaining, "2026-06-01T10:00:00.000Z", "OBSERVE"),
  repairing: mk("repairing", SAMPLE_LABELS.repairing, "2026-07-12T11:00:00.000Z", "OBSERVE"),
  replacing: mk("replacing", SAMPLE_LABELS.replacing, "2026-08-03T09:30:00.000Z", "OBSERVE"),
  renovating: mk("renovating", SAMPLE_LABELS.renovating, "2026-09-01T08:00:00.000Z", "OBSERVE"),
  decommissioning: mk("decommissioning", SAMPLE_LABELS.decommissioning, "2036-01-10T10:00:00.000Z", "DELETE"),
  recycling: mk("recycling", SAMPLE_LABELS.recycling, "2036-02-01T10:00:00.000Z", "OBSERVE"),
  destroying: mk("destroying", SAMPLE_LABELS.destroying, "2036-03-01T10:00:00.000Z", "DELETE"),
  recovering: mk("recovering", SAMPLE_LABELS.recovering, "2036-04-01T10:00:00.000Z", "OBSERVE", {
    "dpp:recoveryStream": "aggregate reuse",
  }),
};

/** @deprecated Use SAMPLE_PAYLOADS — kept for imports that expect the old names. */
export const EXAMPLE_COMMISSIONING = SAMPLE_PAYLOADS.commissioning;
export const EXAMPLE_SHIPPING = SAMPLE_PAYLOADS.shipping;
export const EXAMPLE_INSTALLING = SAMPLE_PAYLOADS.installing;
