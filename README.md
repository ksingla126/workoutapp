# Road to Dec 25

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
| `public/custom.js` | Exercise library, routine builder, food database, meal builder and food diary |
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
