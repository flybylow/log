import { Handle, Position } from "@xyflow/react";
import type { Node, NodeProps } from "@xyflow/react";
import { Link } from "react-router-dom";
import type { FlowNodeData } from "./graphLayout";
import { CopyableHash, renderTextWithLinks } from "./linkify";
import { getGraphResourceLinks } from "./identifierLinks";

export type GraphFlowNode = Node<FlowNodeData, "graph">;

const kindStyles: Record<
  FlowNodeData["kind"],
  { border: string; bg: string; text: string }
> = {
  event: {
    border: "border-violet-500/70",
    bg: "bg-violet-50 dark:bg-violet-950/50",
    text: "text-violet-950 dark:text-violet-100",
  },
  product: {
    border: "border-blue-500/70",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-950 dark:text-blue-100",
  },
  location: {
    border: "border-emerald-500/70",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-950 dark:text-emerald-100",
  },
  actor: {
    border: "border-orange-400/80",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    text: "text-orange-950 dark:text-orange-100",
  },
  hash: {
    border: "border-slate-400/60",
    bg: "bg-slate-100 dark:bg-slate-800/80",
    text: "text-slate-800 dark:text-slate-100",
  },
  other: {
    border: "border-slate-400/50",
    bg: "bg-slate-50 dark:bg-slate-900/50",
    text: "text-slate-900 dark:text-slate-100",
  },
};

export function GraphNode({ id, data }: NodeProps<GraphFlowNode>) {
  const st = kindStyles[data.kind] ?? kindStyles.other;
  const isHash = data.kind === "hash";
  const eventUri =
    data.kind === "event" &&
    (id.startsWith("http://") || id.startsWith("https://"))
      ? id
      : undefined;
  const resourceUri = data.resourceUrl || eventUri;
  const resourceLinks = resourceUri ? getGraphResourceLinks(resourceUri) : null;

  return (
    <div
      className={`relative rounded-xl border px-3 py-2 shadow-sm ${st.border} ${st.bg} ${st.text} ${
        isHash ? "rounded-full px-2 py-1 text-xs" : "min-w-[140px] max-w-[220px]"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-400" />
      <Handle type="source" position={Position.Right} className="!bg-slate-400" />
      <div className={`font-medium leading-tight ${isHash ? "text-center" : ""}`}>
        {isHash ? (
          <CopyableHash
            full={data.literals?.sha256 ?? data.label}
            short={data.label}
            className={`nodrag ${st.text}`}
          />
        ) : (
          renderTextWithLinks(data.label, "nodrag")
        )}
      </div>
      {!isHash && data.subtitle && (
        <div className="mt-1 truncate text-xs opacity-80">
          {renderTextWithLinks(data.subtitle, "nodrag")}
        </div>
      )}
      {data.kind === "event" && data.eventHashHex && (
        <Link
          to={`/event/${data.eventHashHex}`}
          className="nodrag mt-1 inline-block text-[10px] font-semibold text-violet-800 underline decoration-violet-500/50 underline-offset-2 hover:text-violet-950 dark:text-violet-300 dark:hover:text-violet-100"
        >
          Event details →
        </Link>
      )}
      {!isHash && resourceLinks && (
        <div className="nodrag mt-1 flex max-w-full flex-col gap-0.5 text-[10px] font-medium">
          <a
            href={resourceLinks.primary.href}
            target="_blank"
            rel="noopener noreferrer"
            title={resourceLinks.primary.title}
            className="truncate text-emerald-700 underline decoration-emerald-600/40 underline-offset-2 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            {resourceLinks.primary.line}
          </a>
          {resourceLinks.secondary && (
            <a
              href={resourceLinks.secondary.href}
              target="_blank"
              rel="noopener noreferrer"
              title={resourceLinks.secondary.title}
              className="truncate text-slate-600 underline decoration-slate-400/50 underline-offset-2 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {resourceLinks.secondary.line}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
