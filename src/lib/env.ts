const PLACEHOLDER = /YOUR_|CAMBIE_|example\.supabase|xxxxxxxx/i;

function readEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim() ?? "";
    if (value && !PLACEHOLDER.test(value)) {
      return value;
    }
  }
  return "";
}

/** URL del proyecto Supabase. Acepta PUBLIC_ o NEXT_PUBLIC_. */
export function supabaseUrl(): string {
  return readEnv("NEXT_PUBLIC_SUPABASE_URL", "PUBLIC_SUPABASE_URL");
}

/** Clave anon (pública) de Supabase. Acepta PUBLIC_ o NEXT_PUBLIC_. */
export function supabaseAnonKey(): string {
  return readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "PUBLIC_SUPABASE_ANON_KEY");
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseAnonKey());
}

/**
 * PIN solo para el modo local (sin Supabase).
 * En GitHub Pages el PIN real vive en la tabla configuracion de Supabase (ORG_PIN).
 */
export function localOrgPin(): string {
  return readEnv("NEXT_PUBLIC_ORG_PIN", "ORG_PIN") || "sjb36";
}
