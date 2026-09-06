import type { NextConfig } from "next";

const PLACEHOLDER = /YOUR_|CAMBIE_|example\.supabase|xxxxxxxx/i;

function cleanEnv(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  return !trimmed || PLACEHOLDER.test(trimmed) ? "" : trimmed;
}

const supabaseUrl =
  cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
  cleanEnv(process.env.PUBLIC_SUPABASE_URL);
const supabaseAnonKey =
  cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  cleanEnv(process.env.PUBLIC_SUPABASE_ANON_KEY);
const orgPin = cleanEnv(process.env.NEXT_PUBLIC_ORG_PIN) || cleanEnv(process.env.ORG_PIN);

if (process.env.GITHUB_PAGES === "true" && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    "GitHub Pages build is missing PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_* aliases).",
  );
}

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  agentRules: false,
  basePath: process.env.GITHUB_PAGES === "true" ? "/rosario-cadena-encuentro-36" : "",
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
    NEXT_PUBLIC_ORG_PIN: orgPin,
  },
};

export default nextConfig;
