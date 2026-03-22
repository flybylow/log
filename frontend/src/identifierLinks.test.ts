import { describe, expect, it } from "vitest";
import {
  getGraphResourceLinksWithConfig,
  resolveHttpUrlForUiWithConfig,
} from "./identifierLinks";

describe("resolveHttpUrlForUiWithConfig", () => {
  it("passes through non-GS1 URLs", () => {
    const u = "https://example.com/path";
    expect(resolveHttpUrlForUiWithConfig(u, {})).toEqual({ href: u, title: u });
  });

  it("uses docs base for GS1 when set", () => {
    const gs1 = "https://id.gs1.org/01/05413456000012/21/DEMO-ASSET-001";
    const r = resolveHttpUrlForUiWithConfig(gs1, {
      docsBase: "https://tabulas.eu/docs/dpp",
    });
    expect(r.href).toBe(
      "https://tabulas.eu/docs/dpp?uri=" + encodeURIComponent(gs1)
    );
    expect(r.title).toContain("DEMO-ASSET-001");
  });

  it("keeps GS1 href when no docs base but improves title", () => {
    const gs1 = "https://id.gs1.org/01/05413456000012/21/DEMO-ASSET-001";
    const r = resolveHttpUrlForUiWithConfig(gs1, {});
    expect(r.href).toBe(gs1);
    expect(r.title.toLowerCase()).toContain("canonical");
  });
});

describe("getGraphResourceLinksWithConfig", () => {
  it("returns primary + secondary when docs base set", () => {
    const gs1 = "https://id.gs1.org/01/05413456000012/21/DEMO-ASSET-001";
    const g = getGraphResourceLinksWithConfig(gs1, {
      docsBase: "https://tabulas.eu/docs/dpp",
    });
    expect(g.primary.line).toBe("Project docs");
    expect(g.secondary?.href).toBe(gs1);
    expect(g.secondary?.line.length).toBeGreaterThan(0);
  });
});
