import type { Request, Response, NextFunction } from "express";

/**
 * 301 from Host `www.<canonical>` to `https://<canonical><path>` (same path and query as `req.originalUrl`).
 * Use when nginx forwards both apex and www to this app.
 */
export function wwwRedirectMiddleware(canonicalHost: string) {
  const ch = canonicalHost.trim().toLowerCase();
  const wwwHost = `www.${ch}`;

  return (req: Request, res: Response, next: NextFunction) => {
    const raw = req.headers.host ?? "";
    const host = raw.split(":")[0].toLowerCase();
    if (host === wwwHost) {
      res.redirect(301, `https://${ch}${req.originalUrl}`);
      return;
    }
    next();
  };
}
