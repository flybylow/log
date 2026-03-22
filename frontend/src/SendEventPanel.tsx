import { useState, type FormEvent } from "react";
import {
  EXAMPLE_COMMISSIONING,
  EXAMPLE_INSTALLING,
  EXAMPLE_SHIPPING,
} from "./embeddedExamples";

type Props = {
  onSent: () => void;
};

export function SendEventPanel({ onSent }: Props) {
  const [body, setBody] = useState(EXAMPLE_COMMISSIONING);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const applySample = (key: string) => {
    if (key === "commissioning") setBody(EXAMPLE_COMMISSIONING);
    else if (key === "shipping") setBody(EXAMPLE_SHIPPING);
    else if (key === "installing") setBody(EXAMPLE_INSTALLING);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMessage(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(body) as unknown;
    } catch {
      setErr("Invalid JSON");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const text = await res.text();
      if (!res.ok) {
        setErr(text || `HTTP ${res.status}`);
        return;
      }
      setMessage(text);
      onSent();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border-b border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/50">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        1. Send EPCIS event
      </h2>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        POST JSON-LD to the pipeline. Construction samples below; graph updates after accept.
      </p>
      <form onSubmit={submit} className="mt-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Sample
          </label>
          <select
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            onChange={(e) => applySample(e.target.value)}
            defaultValue="commissioning"
          >
            <option value="commissioning">Commissioning (inloopdouche)</option>
            <option value="shipping">Shipping (mixer)</option>
            <option value="installing">Installing (site)</option>
          </select>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send event"}
          </button>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          spellCheck={false}
          className="h-40 w-full resize-y rounded-lg border border-slate-300 bg-white p-3 font-mono text-[11px] leading-relaxed text-slate-800 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
        />
        {err && (
          <p className="text-xs text-red-600 dark:text-red-400" role="alert">
            {err}
          </p>
        )}
        {message && (
          <pre className="max-h-32 overflow-auto rounded-lg bg-slate-900 p-2 text-[11px] text-emerald-400">
            {message}
          </pre>
        )}
      </form>
    </section>
  );
}
