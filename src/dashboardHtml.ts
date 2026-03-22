import type { TimelineEntry } from "./recentTimeline";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderDashboard(
  timeline: TimelineEntry[],
  opts: { eventCount: number; frontends: string }
): string {
  const rows = [...timeline].reverse().map((e) => {
    const step = e.bizStep ? esc(e.bizStep) : "—";
    const epc = e.epcFirst ? esc(e.epcFirst) : "—";
    return `<tr>
  <td><code>${esc(e.hash.slice(0, 12))}…</code></td>
  <td>${esc(e.eventTime)}</td>
  <td>${step}</td>
  <td>${esc(e.classification)}</td>
  <td class="epc">${epc}</td>
</tr>`;
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>dpp-event — event log</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 1.5rem; max-width: 56rem; color: #1a1a1a; }
    h1 { font-size: 1.25rem; }
    p.muted { color: #555; font-size: 0.9rem; }
    nav a { margin-right: 1rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.875rem; }
    th, td { text-align: left; padding: 0.4rem 0.5rem; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; }
    td.epc { max-width: 14rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    code { font-size: 0.8rem; }
  </style>
</head>
<body>
  <h1>dpp-event — lineaire tijdlijn</h1>
  <p class="muted">API-host (bijv. <code>log.tabulas.eu</code>). Voorkant voor gebruikers: ${esc(
    opts.frontends
  )}</p>
  <p><strong>Totaal geaccepteerd:</strong> ${opts.eventCount} · <strong>rijen hier:</strong> ${timeline.length}</p>
  <nav>
    <a href="/api/timeline">JSON tijdlijn</a>
    <a href="/status">status</a>
    <a href="/graph">Turtle graph</a>
  </nav>
  <table>
    <thead>
      <tr><th>hash</th><th>eventTime</th><th>bizStep</th><th>classificatie</th><th>eerste EPC</th></tr>
    </thead>
    <tbody>
      ${rows.length ? rows.join("\n") : "<tr><td colspan=\"5\">Nog geen events.</td></tr>"}
    </tbody>
  </table>
</body>
</html>`;
}
