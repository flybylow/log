// Step 1: VALIDATE
// Checks EPCIS 2.0 structure: type, eventTime, bizStep, epcList/inputEPCList

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const VALID_EVENT_TYPES = [
  "ObjectEvent",
  "AggregationEvent",
  "TransactionEvent",
  "TransformationEvent",
];

const VALID_BIZ_STEPS = [
  "commissioning",
  "manufacturing",
  "assembling",
  "inspecting",
  "shipping",
  "receiving",
  "installing",
  "repairing",
  "maintaining",
  "recycling",
  "destroying",
  "decommissioning",
  "certifying",
  "storing",
  "packing",
  "unpacking",
  "loading",
  "unloading",
  "accepting",
  "returning",
  /** Construction / built-environment lifecycle (Send EPCIS samples) */
  "designing",
  "permitting",
  "specifying",
  "ordering",
  "occupying",
  "replacing",
  "renovating",
  "recovering",
];

export function validate(event: any): ValidationResult {
  const errors: string[] = [];

  if (!event || typeof event !== "object") {
    return { valid: false, errors: ["Event must be a JSON object"] };
  }

  if (!event.type) {
    errors.push("Missing 'type' field");
  } else if (!VALID_EVENT_TYPES.includes(event.type)) {
    errors.push(
      `Invalid event type '${event.type}'. Expected: ${VALID_EVENT_TYPES.join(", ")}`
    );
  }

  if (!event.eventTime) {
    errors.push("Missing 'eventTime' field");
  } else {
    const d = new Date(event.eventTime);
    if (isNaN(d.getTime())) {
      errors.push("'eventTime' is not a valid ISO 8601 timestamp");
    }
  }

  const hasEpcList =
    Array.isArray(event.epcList) && event.epcList.length > 0;
  const hasInputEpcList =
    Array.isArray(event.inputEPCList) && event.inputEPCList.length > 0;
  const hasQuantityList =
    Array.isArray(event.quantityList) && event.quantityList.length > 0;
  if (!hasEpcList && !hasInputEpcList && !hasQuantityList) {
    errors.push(
      "Must include at least one of: epcList, inputEPCList, quantityList"
    );
  }

  if (event.bizStep && !VALID_BIZ_STEPS.includes(event.bizStep)) {
    errors.push(
      `Unknown bizStep '${event.bizStep}'. Known: ${VALID_BIZ_STEPS.join(", ")}`
    );
  }

  return { valid: errors.length === 0, errors };
}
