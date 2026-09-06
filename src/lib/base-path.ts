/**
 * Resolve Next.js `basePath` / `assetPrefix` from the environment.
 *
 * - Dev / GitHub Pages: `/rosario-cadena-encuentro-36`
 * - Prod / Cloudflare: `/rosariocadena`
 * `BASE_PATH` always wins when set.
 */
export function resolveBasePath(
  env: Record<string, string | undefined> = process.env,
): string {
  const raw = env.BASE_PATH?.trim() ?? "";
  if (raw && raw !== "/") {
    const prefixed = raw.startsWith("/") ? raw : `/${raw}`;
    return prefixed.replace(/\/+$/, "");
  }
  if (env.GITHUB_PAGES === "true") {
    return "/rosario-cadena-encuentro-36";
  }
  if (env.CLOUDFLARE_PROD === "true" || env.CF_PAGES === "1" || env.CF_PAGES === "true") {
    return "/rosariocadena";
  }
  return "";
}

/** Prefix a root-relative public asset path with the active `basePath`. */
export function withBasePath(
  path: string,
  env: Record<string, string | undefined> = process.env,
): string {
  const base = resolveBasePath(env);
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
