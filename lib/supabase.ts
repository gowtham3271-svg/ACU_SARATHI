import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://whsbfprmeerxojgnuhrd.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indoc2JmcHJtZWVyeG9qZ251aHJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1ODY4OTEsImV4cCI6MjEwNDE2Mjg5MX0.J2CFE9d-DxKHhV0OlTZjKcR5kqOaTkNILooO9gsWz-A";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// In-memory cache for secrets to avoid querying DB on every single request
const secretCache = new Map<string, { value: string; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function getSecret(key: string): Promise<string> {
  const cached = secretCache.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  // Check process.env first
  if (process.env[key]) {
    const val = process.env[key]!;
    secretCache.set(key, { value: val, expiresAt: now + CACHE_TTL_MS });
    return val;
  }

  // Fetch from Supabase via get_app_secret RPC
  try {
    const { data, error } = await supabase.rpc("get_app_secret", { p_key: key });
    if (!error && data) {
      secretCache.set(key, { value: data, expiresAt: now + CACHE_TTL_MS });
      return data;
    }
    if (error) {
      console.warn(`Could not retrieve secret ${key} via RPC:`, error.message);
    }
  } catch (err) {
    console.warn(`Error fetching secret ${key}:`, err);
  }

  return "";
}
