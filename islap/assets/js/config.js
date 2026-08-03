// =====================================================================
// config.js
// -----------------------------------------------------------------
// Since this project is plain static HTML/JS (no Next.js/Node build
// step), there's no server-side process to inject
// NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY at build
// time. Instead, drop your values in here.
//
// This is safe to expose publicly: the Supabase "anon" key is a
// public, rate-limited key that is meant to be used from the browser.
// All real protection happens via Row Level Security (see sql/schema.sql).
//
// If you later move this into a bundler (Vite/Next.js/etc.), just
// replace the two lines below with:
//   export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
//   export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
// =====================================================================

export const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR-SUPABASE-ANON-PUBLIC-KEY";
