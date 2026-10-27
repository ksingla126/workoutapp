# RankUp

A training app: gym and run plans with progressive overload, live workout timer, meal prep, Strava imports,
progress charts, standings, outlook, and an AI coach (Claude).

## How it's built

| Part | What it does |
|---|---|
| `public/index.html` | The whole app (one page, works offline-first, installable to the home screen) |
| `public/platform.js` | Sign-in, cloud storage (Supabase) and the coach connection |
| `api/config.js` | Gives the page the public Supabase settings |
| `api/coach.js` | Calls Claude for signed-in users, with a daily limit per user |
| `api/foods.js` | Searches the USDA FoodData Central database for signed-in users |
| `api/barcode.js` | Barcode lookup: USDA branded foods, Open Food Facts, products other users entered, then UPCitemdb |
| `public/custom.js` | Exercise library, routine builder, food database, meal builder and food diary |
| `public/ranks.js` | Rank system (E–S): scoring, placement, Gates, demotion, the Ranks screen |
| `public/formcheck.js` | Form check: tracks the body in a video on the phone (MediaPipe, files in `public/pose/`) and checks each rep. No uploads, no AI calls |
| `public/rank-config.js` | Every rank number: ladders, conversion rates, age factors, timers. Tune here, not in code |
| `supabase/schema.sql` | Database tables and the rules that keep each user's data private |

## Setup

### 1. Supabase (database + sign-in)
1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query**: paste all of `supabase/schema.sql` and click **Run**.
3. **Project Settings → API**: copy the **Project URL** and the **anon public** key.
4. **Authentication → URL Configuration**: set **Site URL** to your Vercel address (step 3), e.g. `https://workoutapp.vercel.app`.

### 2. Anthropic (the coach)
1. At [console.anthropic.com](https://console.anthropic.com), add a few dollars of credit.
2. **Settings → Limits**: set a low monthly spend limit.
3. **API Keys → Create key**. Keep it secret: it only ever goes into Vercel.

### 3. Vercel (hosting)
1. At [vercel.com](https://vercel.com), sign in with GitHub → **Add New → Project** → import `workoutapp`.
2. Leave the build settings as they are. Under **Environment Variables** add:

| Name | Value |
|---|---|
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_ANON_KEY` | Supabase anon public key |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `COACH_DAILY_LIMIT` | *(optional)* coach requests per user per day, default 60 |
| `CLAUDE_MODEL` | *(optional)* default `claude-sonnet-5-5` |
| `USDA_API_KEY` | Free key from [api.data.gov/signup](https://api.data.gov/signup/) for USDA food search (falls back to the shared `DEMO_KEY`, which allows very few searches) |

3. **Deploy**. Every push to `main` redeploys automatically.

### 4. Install on iPhone
Open the site in Safari → **Share → Add to Home Screen**.

## Optional: Strava auto-import

1. Create an API app at [strava.com/settings/api](https://www.strava.com/settings/api). Set **Authorization Callback Domain** to your app's domain (e.g. `workoutapp-nine-bay.vercel.app`, no `https://`).
2. In Supabase **SQL Editor**, run `supabase/migrations-002-strava.sql`.
3. In Vercel add `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` (from the Strava app page) and `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API keys → Legacy → **service_role**; server only, never in the app code). Optional: `APP_URL` (e.g. `https://workoutapp-nine-bay.vercel.app`) so Strava always returns to that domain. Redeploy.
4. In the app: account button → **Connect Strava**. If something's misconfigured, the account panel says which setting to fix.

## Shared barcodes

When a scan finds nothing and someone types in the product (name and package size, or the nutrition label), it's shared so the next person who scans that barcode gets it straight away.

1. In Supabase **SQL Editor**, run `supabase/migrations-003-shared-barcodes.sql`.
2. Make sure `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel (the same one Strava uses). Entries are written by the server so each one is tied to the signed-in user; other users can read the product but never see who added it.

Barcode lookups also use `USDA_API_KEY`: USDA's branded foods are matched on the UPC and are usually the best source for US groceries.

