// =====================================================================
// auth-guard.js
// -----------------------------------------------------------------
// Shared helpers used by every "inside the app" page (feed, profile,
// onboarding): checking the current session, protecting routes from
// unauthenticated visitors, fetching the current user's profile, and
// wiring up the navbar (sign out button etc).
// =====================================================================

import { supabase } from "./supabaseClient.js";

/**
 * Returns the current Supabase auth session, or null if signed out.
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Error getting session:", error.message);
    return null;
  }
  return data.session;
}

/**
 * Redirects to the landing page if there is no active session.
 * Call this at the top of every protected page.
 * Returns the session if one exists (so callers don't need to fetch twice).
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }
  return session;
}

/**
 * Fetches the public profile row for a given user id.
 * Returns null if no profile exists yet (i.e. user hasn't onboarded).
 */
export async function getProfileById(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching profile:", error.message);
    return null;
  }
  return data;
}

/**
 * Fetches a public profile row by its anonymous username.
 */
export async function getProfileByUsername(username) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    console.error("Error fetching profile by username:", error.message);
    return null;
  }
  return data;
}

/**
 * Ensures the signed-in user has completed onboarding (has a profile row).
 * If not, sends them to onboarding.html.
 * If they do, returns the profile.
 */
export async function requireProfile(userId) {
  const profile = await getProfileById(userId);
  if (!profile) {
    window.location.href = "onboarding.html";
    return null;
  }
  return profile;
}

/**
 * Wires up the shared navbar: fills in the "My Profile" link with the
 * current username, and hooks up the Sign Out button. Call this once
 * `session` + `profile` are known.
 */
export function initNavbar(profile) {
  const profileLink = document.getElementById("nav-profile-link");
  if (profileLink && profile) {
    profileLink.href = `profile.html?u=${encodeURIComponent(profile.username)}`;
  }

  const signOutBtn = document.getElementById("nav-signout-btn");
  if (signOutBtn) {
    signOutBtn.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.href = "index.html";
    });
  }
}
