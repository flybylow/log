import type { ReactNode } from "react";
import { resolveHttpUrlForUi } from "./identifierLinks";

const URL_IN_TEXT =
  /(https?:\/\/[^\s<>"')]+|www\.[^\s<>"')]+)/gi;

const linkClass =
  "break-all font-medium text-emerald-700 underline decoration-emerald-600/50 underline-offset-2 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300";

/** Turn http(s) and www. segments into external links. Use `anchorClass` e.g. `nodrag` inside React Flow nodes. */
export function renderTextWithLinks(text: string, anchorClass = ""): ReactNode {
  if (!text) return null;
  const parts: ReactNode[] = [];
  const re = new RegExp(URL_IN_TEXT.source, "gi");
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(<span key={`t-${key++}`}>{text.slice(last, m.index)}</span>);
    }
    let raw = m[0];
    if (raw.startsWith("www.")) raw = `https://${raw}`;
    const { href, title } =
      raw.startsWith("http://") || raw.startsWith("https://")
        ? resolveHttpUrlForUi(raw)
        : { href: raw, title: raw };
    parts.push(
      <a
        key={`a-${key++}`}
        href={href}
        title={title}
        target="_blank"
        rel="noopener noreferrer"
        className={anchorClass ? `${linkClass} ${anchorClass}` : linkClass}
      >
        {m[0]}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    parts.push(<span key={`t-${key++}`}>{text.slice(last)}</span>);
  }
  return parts.length > 0 ? <>{parts}</> : text;
}

type CopyableHashProps = {
  /** Full hex or string to copy */
  full: string;
  /** Short label shown in UI */
  short: string;
  className?: string;
};

/** Click to copy full hash to clipboard; hover shows full value. */
export function CopyableHash({ full, short, className = "" }: CopyableHashProps) {
  return (
    <button
      type="button"
      title={full}
      onClick={() => {
        void navigator.clipboard.writeText(full).catch(() => {
          /* ignore */
        });
      }}
      className={`cursor-pointer border-0 bg-transparent p-0 text-left font-mono underline decoration-dotted decoration-slate-400 underline-offset-2 hover:text-emerald-700 hover:decoration-emerald-600 dark:hover:text-emerald-400 ${className}`}
    >
      {short}
    </button>
  );
}
