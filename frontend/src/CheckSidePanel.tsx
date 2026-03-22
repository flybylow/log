import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { KnowledgeGraphNode } from "./forceGraphData";
import { NodeDetailsDl } from "./NodeDetailsDl";
import type { TimelineEntry } from "./types/timeline";
import { TimelineWidget } from "./TimelineWidget";

type TabId = "timeline" | "details";

type Props = {
  timelineEvents: TimelineEntry[];
  loading: boolean;
  selected: KnowledgeGraphNode | null;
  graphData: {
    nodes: KnowledgeGraphNode[];
    links: Array<{ source: string; target: string; name?: string }>;
  };
};

export function CheckSidePanel({ timelineEvents, loading, selected, graphData }: Props) {
  const [tab, setTab] = useState<TabId>("timeline");

  useEffect(() => {
    if (selected) setTab("details");
  }, [selected]);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 shrink-0 flex-col border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:w-80">
      <div
        role="tablist"
        aria-label="Event line"
        className="flex shrink-0 gap-0 border-b border-slate-200 px-2 pt-2 dark:border-slate-800"
      >
        <button
          type="button"
          role="tab"
          id="tab-timeline"
          aria-selected={tab === "timeline"}
          aria-controls="tabpanel-timeline"
          tabIndex={tab === "timeline" ? 0 : -1}
          onClick={() => setTab("timeline")}
          className={
            tab === "timeline"
              ? "-mb-px border-b-2 border-emerald-600 px-3 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-500 dark:text-emerald-300"
              : "border-b-2 border-transparent px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }
        >
          Timeline
        </button>
        <button
          type="button"
          role="tab"
          id="tab-details"
          aria-selected={tab === "details"}
          aria-controls="tabpanel-details"
          tabIndex={tab === "details" ? 0 : -1}
          onClick={() => setTab("details")}
          className={
            tab === "details"
              ? "-mb-px border-b-2 border-emerald-600 px-3 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-500 dark:text-emerald-300"
              : "border-b-2 border-transparent px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }
        >
          Node details
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div
          id="tabpanel-timeline"
          role="tabpanel"
          aria-labelledby="tab-timeline"
          hidden={tab !== "timeline"}
          className={tab === "timeline" ? "flex h-full min-h-0 flex-col" : "hidden"}
        >
          <TimelineWidget embedded events={timelineEvents} loading={loading} />
        </div>

        <div
          id="tabpanel-details"
          role="tabpanel"
          aria-labelledby="tab-details"
          hidden={tab !== "details"}
          className={
            tab === "details"
              ? "flex h-full min-h-0 flex-col overflow-y-auto px-3 py-3"
              : "hidden"
          }
        >
          {!selected ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select a node on the graph to see properties here.
            </p>
          ) : (
            <>
              <NodeDetailsDl node={selected} graphData={graphData} />
              {selected.kind === "event" && selected.eventHashHex && (
                <Link
                  to={`/event/${selected.eventHashHex}`}
                  className="mt-3 inline-block text-xs font-semibold text-violet-800 underline dark:text-violet-300"
                >
                  Event details →
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
