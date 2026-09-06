import { describe, expect, it } from "vitest";
import { resolveBasePath, withBasePath } from "../src/lib/base-path";

describe("resolveBasePath", () => {
  it("uses BASE_PATH when set (prod)", () => {
    expect(resolveBasePath({ BASE_PATH: "/rosariocadena" })).toBe("/rosariocadena");
  });

  it("uses BASE_PATH when set (dev Pages)", () => {
    expect(
      resolveBasePath({
        BASE_PATH: "/rosario-cadena-encuentro-36",
        GITHUB_PAGES: "true",
      }),
    ).toBe("/rosario-cadena-encuentro-36");
  });

  it("normalizes a missing leading slash and trailing slashes", () => {
    expect(resolveBasePath({ BASE_PATH: "rosariocadena/" })).toBe("/rosariocadena");
  });

  it("falls back to the GitHub Pages path", () => {
    expect(resolveBasePath({ GITHUB_PAGES: "true" })).toBe("/rosario-cadena-encuentro-36");
  });

  it("falls back to the Cloudflare prod path", () => {
    expect(resolveBasePath({ CLOUDFLARE_PROD: "true" })).toBe("/rosariocadena");
    expect(resolveBasePath({ CF_PAGES: "1" })).toBe("/rosariocadena");
  });

  it("is empty for local next build", () => {
    expect(resolveBasePath({})).toBe("");
  });
});

describe("withBasePath", () => {
  it("leaves public assets unprefixed in local builds", () => {
    expect(withBasePath("/logos/encuentros-conyugales.jpg", {})).toBe(
      "/logos/encuentros-conyugales.jpg",
    );
  });

  it("prefixes assets for GitHub Pages", () => {
    expect(
      withBasePath("/logos/unidad-liturgia-oracion.jpg", { GITHUB_PAGES: "true" }),
    ).toBe("/rosario-cadena-encuentro-36/logos/unidad-liturgia-oracion.jpg");
  });

  it("prefixes assets for Cloudflare prod", () => {
    expect(withBasePath("/logos/encuentros-conyugales.jpg", { CLOUDFLARE_PROD: "true" })).toBe(
      "/rosariocadena/logos/encuentros-conyugales.jpg",
    );
  });

  it("normalizes a path without a leading slash", () => {
    expect(withBasePath("logos/encuentros-conyugales.jpg", { BASE_PATH: "/rosariocadena" })).toBe(
      "/rosariocadena/logos/encuentros-conyugales.jpg",
    );
  });
});
