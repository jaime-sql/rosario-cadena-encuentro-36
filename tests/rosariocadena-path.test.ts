import { describe, expect, it } from "vitest";
import { isAppPath, originPath, rewriteLocation } from "../workers/rosariocadena-path/src/path";

describe("rosariocadena path router", () => {
  it("matches only the app path prefix", () => {
    expect(isAppPath("/rosariocadena")).toBe(true);
    expect(isAppPath("/rosariocadena/")).toBe(true);
    expect(isAppPath("/rosariocadena/organizador/")).toBe(true);
    expect(isAppPath("/")).toBe(false);
    expect(isAppPath("/other")).toBe(false);
    expect(isAppPath("/rosariocadena-extra")).toBe(false);
  });

  it("strips the public prefix for the Pages origin", () => {
    expect(originPath("/rosariocadena")).toBe("/");
    expect(originPath("/rosariocadena/")).toBe("/");
    expect(originPath("/rosariocadena/organizador/")).toBe("/organizador/");
    expect(originPath("/rosariocadena/_next/static/x.js")).toBe("/_next/static/x.js");
  });

  it("rewrites Pages origin redirects onto the public host + prefix", () => {
    const requestUrl = new URL("https://mecsjb.org/rosariocadena/organizador");
    expect(
      rewriteLocation(
        "https://rosario-cadena.pages.dev/organizador/",
        requestUrl,
        "https://rosario-cadena.pages.dev",
      ),
    ).toBe("https://mecsjb.org/rosariocadena/organizador/");
  });

  it("prefixes relative redirects that omit the base path", () => {
    const requestUrl = new URL("https://mecsjb.org/rosariocadena");
    expect(
      rewriteLocation("/organizador/", requestUrl, "https://rosario-cadena.pages.dev"),
    ).toBe("https://mecsjb.org/rosariocadena/organizador/");
  });
});
