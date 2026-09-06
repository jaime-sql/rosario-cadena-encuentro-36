const PLACEHOLDER = /YOUR_|CAMBIE_|example\.supabase|xxxxxxxx/i;

function clean(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || PLACEHOLDER.test(trimmed)) {
    return "";
  }
  return trimmed;
}

/**
 * Read public Supabase settings with static `process.env.NAME` access.
 * Next.js only inlines statically written NEXT_PUBLIC_* keys into the client
 * bundle; dynamic lookup like process.env[key] stays empty in the browser.
 */
export function supabaseUrl(): string {
  return (
    clean(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    clean(process.env.PUBLIC_SUPABASE_URL)
  );
}

export function supabaseAnonKey(): string {
  return (
    clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    clean(process.env.PUBLIC_SUPABASE_ANON_KEY)
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseAnonKey());
}

/**
 * PIN solo para el modo local (sin Supabase).
 * En GitHub Pages el PIN real vive en la tabla configuracion de Supabase (ORG_PIN).
 */
export function localOrgPin(): string {
  if (typeof window !== "undefined") {
    const stored = clean(window.localStorage.getItem("rosario-cadena-org-pin-v1") ?? "");
    if (stored) {
      return stored;
    }
  }
  return clean(process.env.NEXT_PUBLIC_ORG_PIN) || clean(process.env.ORG_PIN) || "sjb36";
}
