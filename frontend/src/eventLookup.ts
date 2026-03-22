import { parseTurtleToGraph } from "./parseTurtle";

/** Find the lifecycle event subject URI that has this SHA-256 hash in the graph. */
export function findEventUriBySha256(ttl: string, hash: string): string | undefined {
  const { entities, edges, eventSubjects } = parseTurtleToGraph(ttl);
  for (const es of eventSubjects) {
    const edge = edges.find((g) => g.source === es && g.label === "sha256");
    if (!edge) continue;
    const sha = entities.get(edge.target)?.literals?.sha256;
    if (sha === hash) return es;
  }
  return undefined;
}
