import type { TimelineEntry } from "./types/timeline";
import { CopyableHash, renderTextWithLinks } from "./linkify";

type Props = {
  events: TimelineEntry[];
  loading?: boolean;
};

function shortHash(h: string): string {
  return h.length > 14 ? `${h.slice(0, 10)}…` : h;
}

export function TimelineWidget({ events, loading }: Props) {
  const reversed = [...events].reverse();

  return (
    <aside className="flex h-full min-h-0 w-full shrink-0 flex-col border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:w-80">
      <div className="border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Event timeline
        </h2>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-500">
          Accepted events (newest first). In-memory since last server restart.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading && (
          <p className="px-1 text-xs text-slate-500">Loading…</p>
        )}
        {!loading && reversed.length === 0 && (
          <p className="px-1 text-xs text-slate-500">
            No events yet. Send one above.
          </p>
        )}
        <ul className="space-y-2">
          {reversed.map((ev) => (
            <li
              key={`${ev.hash}-${ev.receivedAt}`}
              className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs dark:border-slate-700 dark:bg-slate-800/80"
            >
              <div className="text-[10px] text-slate-600 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-400">SHA-256: </span>
                <CopyableHash
                  full={ev.hash}
                  short={shortHash(ev.hash)}
                  className="text-slate-700 dark:text-slate-200"
                />
              </div>
              <div className="mt-1 text-slate-800 dark:text-slate-100">
                <span className="font-medium">{ev.bizStep ?? "—"}</span>
                <span className="text-slate-400"> · </span>
                <span className="text-emerald-700 dark:text-emerald-400">
                  {ev.classification}
                </span>
              </div>
              <div
                className="mt-0.5 max-w-full text-[11px] text-slate-600 dark:text-slate-400"
                title={ev.epcFirst ?? ""}
              >
                {ev.epcFirst ? renderTextWithLinks(ev.epcFirst) : "—"}
              </div>
              <div className="mt-1 text-[10px] text-slate-400">
                {ev.eventTime}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
