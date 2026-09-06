import { isAppPath, originPath, rewriteLocation } from "./path";

export interface PathRouterEnv {
  PAGES_ORIGIN: string;
  BASE_PATH: string;
  PUBLIC_ORIGIN: string;
}

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "cf-connecting-ip",
  "cf-ipcountry",
  "cf-ray",
  "cf-visitor",
  "cf-ew-via",
  "cdn-loop",
]);

function filterRequestHeaders(headers: Headers): Headers {
  const out = new Headers();
  for (const [key, value] of headers) {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      out.set(key, value);
    }
  }
  return out;
}

export default {
  async fetch(request: Request, env: PathRouterEnv): Promise<Response> {
    const url = new URL(request.url);
    const basePath = env.BASE_PATH || "/rosariocadena";

    if (!isAppPath(url.pathname, basePath)) {
      return new Response("Not found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    const dest = new URL(url.href);
    dest.host = new URL(env.PAGES_ORIGIN).host;
    dest.protocol = "https:";
    dest.pathname = originPath(url.pathname, basePath);

    const init: RequestInit = {
      method: request.method,
      headers: filterRequestHeaders(request.headers),
      redirect: "manual",
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    const upstream = await fetch(dest, init);
    const headers = new Headers(upstream.headers);
    const location = headers.get("Location");
    if (location) {
      headers.set("Location", rewriteLocation(location, url, env.PAGES_ORIGIN, basePath));
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  },
};
