// =====================================================================
// feed.js
// -----------------------------------------------------------------
// Powers the real-time feed page:
//  - Loads existing posts (joined with the author's public profile)
//  - Subscribes to `postgres_changes` INSERT events on `posts` so new
//    posts from ANY connected user appear instantly, no refresh needed
//  - Handles the "new post" composer form
// =====================================================================

import { supabase } from "./supabaseClient.js";
import { requireAuth, requireProfile, initNavbar } from "./auth-guard.js";

const feedList = document.getElementById("feed-list");
const feedLoading = document.getElementById("feed-loading");
const feedEmpty = document.getElementById("feed-empty");
const template = document.getElementById("post-card-template");

const composerForm = document.getElementById("composer-form");
const composerContent = document.getElementById("composer-content");
const composerMood = document.getElementById("composer-mood");
const composerSubmit = document.getElementById("composer-submit");
const composerError = document.getElementById("composer-error");

// Small in-memory cache so we don't refetch a profile we already have
// (e.g. when the same user posts twice in a row via realtime).
const profileCache = new Map();

let currentUserId = null;

/**
 * Renders a single post object into a DOM node using the <template>.
 * `post` shape: { id, content, mood_status, created_at, profiles: { username } }
 */
function renderPost(post, { animate = false } = {}) {
  const node = template.content.cloneNode(true);
  const article = node.querySelector(".post-card");

  const username = post.profiles?.username ?? "Unknown";
  node.querySelector(".post-username").textContent = "@" + username;
  node.querySelector(".post-username").href = `profile.html?u=${encodeURIComponent(username)}`;

  const moodEl = node.querySelector(".post-mood");
  if (post.mood_status) {
    moodEl.textContent = post.mood_status;
  } else {
    moodEl.remove();
  }

  node.querySelector(".post-content").textContent = post.content;

  const timeEl = node.querySelector(".post-time");
  const date = new Date(post.created_at);
  timeEl.dateTime = post.created_at;
  timeEl.textContent = date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  if (animate) {
    article.classList.add("post-enter");
  }

  return node;
}

/**
 * Loads the most recent posts (newest first) along with each author's
 * public profile via Supabase's foreign-table select syntax.
 */
async function loadInitialPosts() {
  const { data, error } = await supabase
    .from("posts")
    .select("id, content, mood_status, created_at, user_id, profiles ( username )")
    .order("created_at", { ascending: false })
    .limit(50);

  feedLoading.classList.add("hidden");

  if (error) {
    console.error("Error loading posts:", error.message);
    feedEmpty.textContent = "Couldn't load the feed. Try refreshing.";
    feedEmpty.classList.remove("hidden");
    return;
  }

  if (!data || data.length === 0) {
    feedEmpty.classList.remove("hidden");
    return;
  }

  data.forEach((post) => {
    if (post.profiles) profileCache.set(post.user_id, post.profiles);
    feedList.appendChild(renderPost(post));
  });
}

/**
 * Fetches (and caches) the public profile for a user id — used when a
 * brand-new realtime post comes in and we only have its user_id.
 */
async function getCachedProfile(userId) {
  if (profileCache.has(userId)) return profileCache.get(userId);

  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  if (data) profileCache.set(userId, data);
  return data;
}

/**
 * Subscribes to real-time INSERT events on the posts table. This is
 * the core "no refresh needed" behavior: Supabase Realtime pushes the
 * new row over a websocket to every connected client.
 */
function subscribeToNewPosts() {
  supabase
    .channel("public:posts")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "posts" },
      async (payload) => {
        const newPost = payload.new;
        const profile = await getCachedProfile(newPost.user_id);

        feedEmpty.classList.add("hidden");
        const node = renderPost({ ...newPost, profiles: profile }, { animate: true });
        // Newest posts go on top of the feed.
        feedList.prepend(node);
      }
    )
    .subscribe();
}

function showComposerError(msg) {
  composerError.textContent = msg;
  composerError.classList.remove("hidden");
}
function clearComposerError() {
  composerError.classList.add("hidden");
}

function initComposer() {
  composerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearComposerError();

    const content = composerContent.value.trim();
    if (!content) return;

    composerSubmit.disabled = true;
    composerSubmit.textContent = "Slapping...";

    // Note: we don't manually add the post to the DOM here — the
    // realtime subscription above will receive this same INSERT and
    // render it, so every client (including this one) stays in sync
    // from a single source of truth.
    const { error } = await supabase.from("posts").insert({
      user_id: currentUserId,
      content,
      mood_status: composerMood.value || null,
    });

    if (error) {
      showComposerError(error.message);
    } else {
      composerForm.reset();
    }

    composerSubmit.disabled = false;
    composerSubmit.textContent = "Slap it 🙌";
  });
}

async function init() {
  const session = await requireAuth();
  if (!session) return;

  const profile = await requireProfile(session.user.id);
  if (!profile) return;

  currentUserId = session.user.id;
  profileCache.set(session.user.id, { username: profile.username });

  initNavbar(profile);
  initComposer();
  await loadInitialPosts();
  subscribeToNewPosts();
}

init();
