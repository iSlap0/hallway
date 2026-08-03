// =====================================================================
// supabaseClient.js
// -----------------------------------------------------------------
// Single shared Supabase client instance for the whole app.
// Every page imports `supabase` from here instead of creating its own
// client, so auth state / realtime sockets are consistent.
// =====================================================================

// Supabase's official ESM build, loaded straight from a CDN — no
// npm/build step required for this static-HTML version of the app.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Persist the session in localStorage so refreshing the page
    // (or coming back later) keeps the user signed in.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // needed to finish the OAuth redirect flow
  },
});
