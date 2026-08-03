// =====================================================================
// onboarding.js
// -----------------------------------------------------------------
// Handles the first-time setup flow: the user picks an anonymous
// username, sets a password, and optionally a bio + mood badge.
// - The password is set via supabase.auth.updateUser({ password })
//   which Supabase stores securely inside its own auth schema (NOT a
//   plain database table we control).
// - The username/bio/mood_badge are written to the public `profiles`
//   table, which is what the rest of the app reads from.
// =====================================================================

import { supabase } from "./supabaseClient.js";
import { requireAuth, getProfileById } from "./auth-guard.js";

const form = document.getElementById("onboarding-form");
const errorEl = document.getElementById("form-error");
const submitBtn = document.getElementById("submit-btn");

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove("hidden");
}
function clearError() {
  errorEl.classList.add("hidden");
  errorEl.textContent = "";
}

async function init() {
  // Must be signed in (via Google) to reach onboarding at all.
  const session = await requireAuth();
  if (!session) return;

  // If they somehow already have a profile, skip onboarding.
  const existingProfile = await getProfileById(session.user.id);
  if (existingProfile) {
    window.location.href = "feed.html";
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();
    submitBtn.disabled = true;
    submitBtn.textContent = "Slapping it in...";

    const formData = new FormData(form);
    const username = formData.get("username").trim();
    const password = formData.get("password");
    const moodBadge = formData.get("mood_badge");
    const bio = formData.get("bio").trim();

    try {
      // 1) Set the password on the auth user (alongside their Google
      //    login) so it can be used for account/security confirmation.
      const { error: pwError } = await supabase.auth.updateUser({ password });
      if (pwError) throw pwError;

      // 2) Create the public profile row. RLS requires
      //    auth.uid() === id, which is naturally satisfied here since
      //    we pass the current user's own id.
      const { error: profileError } = await supabase.from("profiles").insert({
        id: session.user.id,
        username,
        bio,
        mood_badge: moodBadge,
      });

      if (profileError) {
        // Postgres unique-violation code for the username column.
        if (profileError.code === "23505") {
          throw new Error("That username is already taken — try another one.");
        }
        throw profileError;
      }

      window.location.href = "feed.html";
    } catch (err) {
      showError(err.message || "Something went wrong. Please try again.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Slap into iSlap 🙌";
    }
  });
}

init();
