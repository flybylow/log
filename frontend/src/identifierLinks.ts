/** GS1 Digital Link host — URIs are canonical in EPCIS; the public HTML resolver often has little for demo assets. */
export const GS1_DIGITAL_LINK = /^https:\/\/id\.gs1\.org\//i;

export type IdentifierDocsConfig = { docsBase?: string };

function buildDocsHref(base: string, uri: string): string {
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}uri=${encodeURIComponent(uri)}`;
}

/**
 * Testable resolver: when `docsBase` is set, GS1 Digital Link URLs point at your docs page with `uri=` (you handle display).
 */
export function resolveHttpUrlForUiWithConfig(
  url: string,
  cfg: IdentifierDocsConfig
): { href: string; title: string } {
  const base = cfg.docsBase?.trim();
  if (GS1_DIGITAL_LINK.test(url) && base) {
    return {
      href: buildDocsHref(base, url),
      title: `Open project documentation for this identifier (canonical GS1 Digital Link: ${url})`,
    };
  }
  if (GS1_DIGITAL_LINK.test(url)) {
    return {
      href: url,
      title:
        "Canonical GS1 Digital Link URI in this EPCIS graph. The public GS1 page may not describe this construction demo asset — use the graph and event data as the source of truth.",
    };
  }
  return { href: url, title: url };
}

/**
 * How to render an http(s) URL in the UI: `href`, tooltip.
 * Set **`VITE_IDENTIFIER_DOCS_BASE`** (e.g. a Tabulas page) so GS1 links open your docs with **`?uri=`** instead of only the resolver.
 */
export function resolveHttpUrlForUi(url: string): { href: string; title: string } {
  return resolveHttpUrlForUiWithConfig(url, {
    docsBase: import.meta.env.VITE_IDENTIFIER_DOCS_BASE?.trim(),
  });
}

export type GraphResourceLinks = {
  primary: { href: string; title: string; line: string };
  secondary?: { href: string; title: string; line: string };
};

export function getGraphResourceLinksWithConfig(uri: string, cfg: IdentifierDocsConfig): GraphResourceLinks {
  const base = cfg.docsBase?.trim();
  const short =
    uri.length > 48 ? `${uri.slice(0, 22)}…${uri.slice(-18)}` : uri;

  if (GS1_DIGITAL_LINK.test(uri) && base) {
    return {
      primary: {
        href: buildDocsHref(base, uri),
        title: `Project documentation for this identifier (canonical: ${uri})`,
        line: "Project docs",
      },
      secondary: {
        href: uri,
        title: `Canonical GS1 Digital Link (resolver may be empty for demos): ${uri}`,
        line: short,
      },
    };
  }

  if (GS1_DIGITAL_LINK.test(uri)) {
    return {
      primary: {
        href: uri,
        title:
          "Canonical GS1 Digital Link in this demo. Resolver content may not match this construction scenario — this dashboard and /graph are authoritative.",
        line: short,
      },
    };
  }

  return {
    primary: {
      href: uri,
      title: uri,
      line: short,
    },
  };
}

/** Footer links under a graph node for a resource URI (product, location, event). */
export function getGraphResourceLinks(uri: string): GraphResourceLinks {
  return getGraphResourceLinksWithConfig(uri, {
    docsBase: import.meta.env.VITE_IDENTIFIER_DOCS_BASE?.trim(),
  });
}
