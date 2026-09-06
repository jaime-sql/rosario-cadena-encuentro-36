import { afterEach, describe, expect, it } from "vitest";
import { isSupabaseConfigured, localOrgPin, supabaseAnonKey, supabaseUrl } from "../src/lib/env";

const keys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_ORG_PIN",
  "ORG_PIN",
] as const;

const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    const value = original[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("env helpers", () => {
  it("accepts NEXT_PUBLIC_ names", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://kwbhytabavegnqfeidjw.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";
    delete process.env.PUBLIC_SUPABASE_URL;
    delete process.env.PUBLIC_SUPABASE_ANON_KEY;
    expect(supabaseUrl()).toBe("https://kwbhytabavegnqfeidjw.supabase.co");
    expect(supabaseAnonKey()).toBe("anon-test-key");
    expect(isSupabaseConfigured()).toBe(true);
  });

  it("accepts PUBLIC_ names", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.PUBLIC_SUPABASE_URL = "https://kwbhytabavegnqfeidjw.supabase.co";
    process.env.PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";
    expect(supabaseUrl()).toBe("https://kwbhytabavegnqfeidjw.supabase.co");
    expect(isSupabaseConfigured()).toBe(true);
  });

  it("ignores placeholders so the app stays in local mode", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
    expect(isSupabaseConfigured()).toBe(false);
    expect(localOrgPin()).toBe("sjb36");
  });
});
