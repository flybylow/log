// Step 4: CLASSIFY
// Routes data: public claims to IOTA, private data to Solid Pod.
// Layer 1 (IOTA): public lifecycle events, certifications
// Layer 2 (Tabulas graph): all events as triples
// Layer 3 (Solid Pod): private credentials, costs, audit details

export interface Classification {
  target: "iota" | "pod" | "both" | "graph-only";
  reason: string;
}

const PUBLIC_STEPS = [
  "commissioning",
  "manufacturing",
  "certifying",
  "recycling",
  "destroying",
  "decommissioning",
  "installing",
];

const PRIVATE_STEPS = [
  "shipping",
  "receiving",
  "storing",
];

export function classify(event: any): Classification {
  const step = event.bizStep || "";

  if (event["dpp:private"] === true) {
    return { target: "pod", reason: "Explicitly marked private" };
  }

  if (event.certification || step === "certifying") {
    return { target: "iota", reason: "Certification is a public claim" };
  }

  if (PUBLIC_STEPS.includes(step)) {
    return { target: "iota", reason: `bizStep '${step}' is a public lifecycle event` };
  }

  if (PRIVATE_STEPS.includes(step) && (event.cost || event.supplierDetails)) {
    return { target: "both", reason: `bizStep '${step}' has private fields, hash still notarized` };
  }

  return { target: "iota", reason: "Default: lifecycle events are public" };
}
