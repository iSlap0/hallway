// =====================================================================
// profile.js
// -----------------------------------------------------------------
// Loads a profile by its anonymous username (?u=SomeUsername in the
// URL — the static-HTML equivalent of a Next.js /profile/[username]
// dynamic route), shows their bio/mood/posts, and — only if the
// signed-in user is viewing their OWN profile — lets them edit it.
// =====================================================================

import { supabase } from "./supabaseClient.js";
import { requireAuth, requireProfile, initNavbar, getProfileByUsername } from "./auth-guard.js";

const loadingEl = document.getElementById("profile-loading");
const notFoundEl = document.getElementById("profile-not-found");
const contentEl = document.getElementById("profile-content");

const viewSection = document.getElementById("profile-view");
const usernameEl = document.getElementById("profile-username");
const moodEl = document.getElementById("profile-mood");
const bioEl = document.getElementById("profile-bio");
const joinedEl = document.getElementById("profile-joined");
const editBtn = document.getElementById("edit-profile-btn");

const editSection = document.getElementById("profile-edit");
const editForm = document.getElementById("edit-form");
const editUsername = document.getElementById("edit-username");
const editMood = document.getElementById("edit-mood");
const editBio = document.getElementById("edit-bio");
const editError = document.getElementById("edit-error");
const editSaveBtn = document.getElementById("edit-save-btn");
const editCancelBtn = document.getElementById("edit-cancel-btn");

const postsListEl = document.getElementById("profile-posts");
const postsEmptyEl = document.getElementById("profile-posts-empty");
const postTemplate = document.getElementById("profile-post-template");

function getUsernameFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("u");
}

function renderProfileView(profile) {
  usernameEl.textContent = "@" + profile.username;
  moodEl.textContent = profile.mood_badge || "";
  moodEl.classList.toggle("hidden", !profile.mood_badge);
  bioEl.textContent = profile.bio || "No bio yet.";
  joinedEl.textContent = "Joined " + new Date(profile.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });
}

function renderPosts(posts) {
  postsListEl.innerHTML = "";
  if (!posts || posts.length === 0) {
    postsEmptyEl.classList.remove("hidden");
    return;
  }
  postsEmptyEl.classList.add("hidden");

  posts.forEach((post) => {
    const node = postTemplate.content.cloneNode(true);
    node.querySelector("span.text-xs").textContent = new Date(post.created_at).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    const moodBadge = node.querySelector(".post-mood");
    if (post.mood_status) {
      moodBadge.textContent = post.mood_status;
    } else {
      moodBadge.remove();
    }
    node.querySelector(".post-content").textContent = post.content;
    postsListEl.appendChild(node);
  });
}

async function loadPostsForUser(userId) {
  const { data, error } = await supabase
    .from("posts")
    .select("id, content, mood_status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading user's posts:", error.message);
    return;
  }
  renderPosts(data);
}

function enterEditMode(profile) {
  editUsername.value = profile.username;
  editMood.value = profile.mood_badge || "Feeling new here 👋";
  editBio.value = profile.bio || "";
  editError.classList.add("hidden");

  viewSection.classList.add("hidden");
  editSection.classList.remove("hidden");
}

function exitEditMode() {
  editSection.classList.add("hidden");
  viewSection.classList.remove("hidden");
}

async function init() {
  const session = await requireAuth();
  if (!session) return;

  const myProfile = await requireProfile(session.user.id);
  if (!myProfile) return;

  initNavbar(myProfile);

  // Which profile are we viewing? Default to "my own" if no ?u= given.
  const targetUsername = getUsernameFromUrl() || myProfile.username;
  const viewedProfile = await getProfileByUsername(targetUsername);

  loadingEl.classList.add("hidden");

  if (!viewedProfile) {
    notFoundEl.classList.remove("hidden");
    return;
  }

  contentEl.classList.remove("hidden");
  renderProfileView(viewedProfile);
  await loadPostsForUser(viewedProfile.id);

  const isOwnProfile = viewedProfile.id === session.user.id;
  if (isOwnProfile) {
    editBtn.classList.remove("hidden");
  }

  editBtn.addEventListener("click", () => enterEditMode(viewedProfile));
  editCancelBtn.addEventListener("click", exitEditMode);

  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    editError.classList.add("hidden");
    editSaveBtn.disabled = true;
    editSaveBtn.textContent = "Saving...";

    const newUsername = editUsername.value.trim();
    const newMood = editMood.value;
    const newBio = editBio.value.trim();

    // RLS ensures this update only succeeds because auth.uid() equals
    // this row's id (see sql/schema.sql "Users can update their own profile").
    const { error } = await supabase
      .from("profiles")
      .update({ username: newUsername, mood_badge: newMood, bio: newBio })
      .eq("id", session.user.id);

    if (error) {
      editError.textContent =
        error.code === "23505"
          ? "That username is already taken."
          : error.message;
      editError.classList.remove("hidden");
      editSaveBtn.disabled = false;
      editSaveBtn.textContent = "Save changes";
      return;
    }

    // Reflect changes immediately + update the URL so it matches the
    // (possibly new) username.
    viewedProfile.username = newUsername;
    viewedProfile.mood_badge = newMood;
    viewedProfile.bio = newBio;
    renderProfileView(viewedProfile);
    initNavbar(viewedProfile);
    history.replaceState(null, "", `profile.html?u=${encodeURIComponent(newUsername)}`);

    editSaveBtn.disabled = false;
    editSaveBtn.textContent = "Save changes";
    exitEditMode();
  });
}

init();
