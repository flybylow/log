import { useMemo } from "react";
import {
  linkedResourceRowsForDetails,
  type KnowledgeGraphNode,
} from "./forceGraphData";
import { renderTextWithLinks } from "./linkify";

type GraphSlice = {
  nodes: KnowledgeGraphNode[];
  links: Array<{ source: string; target: string; name?: string }>;
};

type Props = {
  node: KnowledgeGraphNode;
  /** Raw `/graph` data (canonical ids). Used to show linked resources (location, product, …). */
  graphData?: GraphSlice;
  /** Extra classes on the outer `dl` */
  className?: string;
};

/**
 * Name / kind / time, RDF literals, then linked graph neighbors (not duplicated in literals).
 */
export function NodeDetailsDl({ node, graphData, className }: Props) {
  const linked = useMemo(() => {
    if (!graphData?.nodes.length) return [];
    return linkedResourceRowsForDetails(node, graphData.nodes, graphData.links);
  }, [node, graphData]);

  return (
    <dl
      className={
        className ??
        "grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-slate-700 dark:text-slate-300"
      }
    >
      <dt className="font-medium text-slate-500">Name</dt>
      <dd>{renderTextWithLinks(node.name)}</dd>
      <dt className="font-medium text-slate-500">Kind</dt>
      <dd>{node.kind}</dd>
      {node.subtitle && (
        <>
          <dt className="font-medium text-slate-500">Time</dt>
          <dd>{renderTextWithLinks(node.subtitle)}</dd>
        </>
      )}
      {linked.map((row) => (
        <div key={`${row.predicateKey}:${row.neighborId}`} className="contents">
          <dt className="font-medium text-slate-500">{row.label}</dt>
          <dd className="break-words">{renderTextWithLinks(row.name)}</dd>
        </div>
      ))}
      {node.literals &&
        Object.entries(node.literals).map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="font-medium text-slate-500">{k}</dt>
            <dd className="break-all">{renderTextWithLinks(v)}</dd>
          </div>
        ))}
    </dl>
  );
}
