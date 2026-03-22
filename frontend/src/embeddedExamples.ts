/** Construction-vertical EPCIS JSON-LD samples (same as repo /examples). */

export const EXAMPLE_COMMISSIONING = `{
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
  "dpp:model": "Ideo Screen"
}`;

export const EXAMPLE_SHIPPING = `{
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
  "dpp:destination": "Installateur Janssens BVBA"
}`;

export const EXAMPLE_INSTALLING = `{
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
  "dpp:installerCertification": "Cerga G1"
}`;
