# iSlap 🙌

A real-time, anonymous micro-blogging feed — inspired by *The Slap* from
*Victorious* — built with **plain HTML/CSS/JS + Tailwind (CDN) +
Supabase** (Auth, Postgres, Realtime). No build step, no npm install:
just static files you can open locally or drop on any static host.

> Built as static HTML per your request, using the Supabase JS SDK
> loaded from a CDN as an ES module — this is why there's no
> `package.json` / Next.js server. All the same features (Google auth,
> RLS-secured Postgres, live realtime feed) are wired up.

## Project structure

```
islap/
├── index.html              # Landing page + "Sign in with Google"
├── onboarding.html          # First-time setup: username, password, bio, mood
├── feed.html                # Real-time feed + post composer
├── profile.html             # Profile view/edit (?u=username)
├── assets/
│   ├── css/
│   │   └── style.css        # Fonts, brand colors, pop-in animation
│   └── js/
│       ├── config.js         # <-- put your Supabase URL/anon key here
│       ├── supabaseClient.js # shared Supabase client
│       ├── auth-guard.js     # session checks, route protection, navbar
│       ├── tailwind-config.js# Tailwind CDN theme (brand colors/fonts)
│       ├── onboarding.js
│       ├── feed.js
│       └── profile.js
├── sql/
│   └── schema.sql            # Tables + Row Level Security policies
└── README.md
```

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → create a new project.
2. In **SQL Editor**, paste and run the contents of `sql/schema.sql`.
   This creates `profiles`, `posts`, `follows`, enables RLS with the
   policies described in `CORE FEATURES`, and adds `posts` to the
   realtime publication.
3. In **Database → Replication**, double check the `posts` table has
   realtime enabled (the SQL script's last line does this too, but
   it's worth confirming in the UI).

## 2. Enable Google sign-in

1. In the Supabase dashboard: **Authentication → Providers → Google**
   → toggle it on.
2. Create OAuth credentials in the
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   (OAuth client ID, type "Web application").
3. Add the **Authorized redirect URI** Supabase shows you (looks like
   `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`) to your
   Google OAuth client.
4. Paste the Google **Client ID** and **Client Secret** into the
   Supabase Google provider settings and save.
5. In **Authentication → URL Configuration**, add the URL(s) you'll
   serve this app from (e.g. `http://localhost:5500`,
   `https://your-deployed-site.com`) to **Site URL** / **Redirect URLs**.

## 3. Configure the app

Open `assets/js/config.js` and fill in your project's values (found in
**Project Settings → API**):

```js
export const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR-SUPABASE-ANON-PUBLIC-KEY";
```

This is the static-HTML equivalent of `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` — safe to expose publicly, since real
protection comes from Row Level Security, not from hiding this key.

> If you later move this project into a bundler (Vite, Next.js, etc.),
> swap these two lines for real env vars (see the comment at the top
> of `config.js`).

## 4. Run it locally

Because the pages use ES module `<script type="module">` imports, you
need to serve them over `http://` (not open the file directly via
`file://`). Any static file server works, e.g.:

```bash
npx serve .
# or
python3 -m http.server 5500
```

Then visit `http://localhost:5500` (or whatever port), and add that
exact origin to Supabase's **Redirect URLs** as mentioned above.

## 5. Deploy

Drop the whole folder onto any static host — Vercel, Netlify, GitHub
Pages, Cloudflare Pages, S3, etc. No build command needed since these
are already plain HTML/CSS/JS files. Just remember to:

- Add the deployed URL to Supabase's Redirect URLs / Site URL.
- Add the deployed URL as an Authorized redirect URI in your Google
  OAuth client if needed (Supabase's own callback URL usually covers
  this — the app-level redirect is handled via `redirectTo` in
  `index.html`).

## How the pieces fit together

- **Auth**: `index.html` calls `supabase.auth.signInWithOAuth({ provider: "google" })`.
  Supabase handles the whole Google OAuth dance and redirects back to
  the app with a session. We never see or store the user's real name —
  only `auth.users.email` exists (managed entirely by Supabase Auth),
  and no page ever queries or displays it.
- **Onboarding**: `onboarding.js` sets a password via
  `supabase.auth.updateUser({ password })` (stored securely by
  Supabase Auth, not in a plain table) and inserts one row into the
  public `profiles` table — the anonymous identity everyone sees.
- **Realtime feed**: `feed.js` subscribes to
  `postgres_changes` (`INSERT` on `public.posts`) via
  `supabase.channel(...).on("postgres_changes", ...)`. Every connected
  browser gets pushed the new row over a websocket the instant anyone
  inserts a post — no polling, no refresh.
- **Row Level Security**: everything is readable by anyone (public
  feed/profiles), but inserts/updates are restricted to
  `auth.uid() = user_id` / `auth.uid() = id`, enforced at the database
  level — even if someone tampered with client-side JS, Postgres would
  reject the write.
- **Profile routing**: since there's no server-side dynamic routing in
  a static site, `profile.html?u=username` stands in for
  `/profile/[username]`.

## Extending it

- `follows` table + policies are already in `sql/schema.sql` — wire up
  a "Follow" button on `profile.html` and filter the feed query in
  `feed.js` to build a "Following" tab.
- Want this as an actual Next.js/React app instead? The Supabase
  schema, RLS policies, and overall data flow above translate directly
  — swap the vanilla-JS files for React components/hooks that call the
  same `supabase-js` methods.
