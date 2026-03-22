import { Handle, Position } from "@xyflow/react";
import type { FlowNodeData } from "./graphLayout";

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

export function GraphNode({
  data,
}: {
  data: FlowNodeData;
}) {
  const st = kindStyles[data.kind] ?? kindStyles.other;
  const isHash = data.kind === "hash";
  return (
    <div
      className={`relative rounded-xl border px-3 py-2 shadow-sm ${st.border} ${st.bg} ${st.text} ${
        isHash ? "rounded-full px-2 py-1 text-xs" : "min-w-[140px] max-w-[220px]"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-400" />
      <Handle type="source" position={Position.Right} className="!bg-slate-400" />
      <div className={`font-medium leading-tight ${isHash ? "text-center" : ""}`}>
        {data.label}
      </div>
      {!isHash && data.subtitle && (
        <div className="mt-1 truncate text-xs opacity-80">{data.subtitle}</div>
      )}
    </div>
  );
}
