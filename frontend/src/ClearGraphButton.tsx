import { useCallback, useState, type FormEvent } from "react";

type Props = {
  /** When false, nothing is rendered (server has no DPP_GRAPH_RESET_SECRET). */
  enabled: boolean;
  onCleared: () => void | Promise<void>;
};

export function ClearGraphButton({ enabled, onCleared }: Props) {
  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setSecret("");
    setErr(null);
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!secret.trim()) {
      setErr("Enter the reset secret from the server .env (DPP_GRAPH_RESET_SECRET).");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/graph", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${secret.trim()}` },
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401) {
        setErr("Wrong secret.");
        return;
      }
      if (!res.ok) {
        setErr(data.error || `Request failed (${res.status})`);
        return;
      }
      close();
      await Promise.resolve(onCleared());
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setBusy(false);
    }
  };

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-800 shadow-sm hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-800 dark:text-red-300 dark:hover:bg-red-950/40"
      >
        Clear graph…
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-graph-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2
              id="clear-graph-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-50"
            >
              Clear all graph data?
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              This removes every triple from the server and the saved Turtle file, and resets the
              timeline and counters. You need the same secret as{" "}
              <code className="rounded bg-slate-100 px-1 text-[11px] dark:bg-slate-800">
                DPP_GRAPH_RESET_SECRET
              </code>{" "}
              in your{" "}
              <code className="rounded bg-slate-100 px-1 text-[11px] dark:bg-slate-800">.env</code>.
            </p>
            <form onSubmit={(ev) => void submit(ev)} className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Reset secret
                </span>
                <input
                  type="password"
                  autoComplete="off"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                  placeholder="Paste secret"
                />
              </label>
              {err && (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {err}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={close}
                  disabled={busy}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {busy ? "Clearing…" : "Clear graph"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
