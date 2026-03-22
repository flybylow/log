import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { buildHardcodedGraphData, HARDCODED_SIMPLE_GRAPH_TTL } from "./hardcodedDemoGraph";
import { parseTurtleToGraph } from "./parseTurtle";
import { SimpleGraphTestPage } from "./SimpleGraphTestPage";

/** Avoid mounting `react-force-graph-2d` + canvas in jsdom (page test only checks chrome). */
vi.mock("./KnowledgeForceGraph", () => ({
  KnowledgeForceGraph: () => <div data-testid="knowledge-graph-stub" />,
}));

describe("hardcoded demo graph", () => {
  it("TTL parses to multiple events and a shared product", () => {
    const { entities, edges, eventSubjects } = parseTurtleToGraph(HARDCODED_SIMPLE_GRAPH_TTL);
    expect(eventSubjects.length).toBe(2);
    expect(entities.size).toBeGreaterThan(3);
    expect(edges.length).toBeGreaterThan(0);
    const product = entities.get("https://example.test/demo/product-x");
    expect(product?.kind).toBe("product");
  });

  it("buildHardcodedGraphData returns nodes and links for the force graph", () => {
    const { nodes, links } = buildHardcodedGraphData();
    expect(nodes.length).toBeGreaterThan(4);
    expect(links.length).toBeGreaterThan(4);
    expect(nodes.some((n) => n.kind === "event")).toBe(true);
  });
});

describe("SimpleGraphTestPage", () => {
  it("renders title and dashboard link", () => {
    render(
      <MemoryRouter initialEntries={["/simple-graph"]}>
        <Routes>
          <Route path="/simple-graph" element={<SimpleGraphTestPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(
      screen.getByRole("heading", { name: /simple graph \(hard-coded triples\)/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute("href", "/");
  });
});
