# World Cup Mini League

A small, private World Cup prediction game for a group of friends. Predict the
**knockout-stage** matches of the 2026 World Cup, earn points for how close you
get, and climb a shared leaderboard. Magic-link login, per-match predictions
with a once-a-day confidence multiplier, automatic scoring, and a few playful
stats.

**Stack:** SvelteKit (Svelte 5) · Supabase (Postgres + Auth + Row Level
Security) · [football-data.org](https://www.football-data.org) for fixtures and
results · deployed on Vercel with a GitHub Actions cron for score syncing.

## How it works

- Match data comes from football-data.org (free tier covers the World Cup,
  competition code `WC`). A scheduled job polls it and writes results back.
- Only knockout matches are predictable; group games are stored for display.
- Predictions lock at kickoff (enforced by RLS, not just the UI). When a
  knockout match finishes, the sync job runs the scoring function and points
  appear on the scoreboard.
- Scoring is a single Postgres function (`calculate_match_scores`); the tiers
  are documented in `supabase/schema.sql`.

## Prerequisites

- Node 18+ (works on 22; the Vercel adapter is pinned to `nodejs22.x`)
- A [Supabase](https://supabase.com) project (free tier)
- A [football-data.org](https://www.football-data.org/client/register) API
  token (free tier)

## Setup

```bash
npm install
cp .env.example .env   # then fill in the values (see below)
```

### 1. Supabase

1. Create a project. From **Project Settings → API**, copy the project URL,
   the publishable/anon key, and the secret/service-role key.
2. In the **SQL Editor**, run the whole of [`supabase/schema.sql`](supabase/schema.sql).
   This creates the tables, RLS policies, the scoring function, and the stats
   views.
3. **Authentication → Providers**: enable Email. Under **URL Configuration**,
   set the Site URL and add `<site>/auth/callback` as a redirect URL
   (`http://localhost:5173/auth/callback` for local dev).
4. Create your league and pick an invite code to share:
   ```sql
   insert into leagues (name, invite_code, created_by)
   values ('Our World Cup League', 'YOUR-INVITE-CODE', null);
   ```

### 2. Environment

Fill `.env` (never commit it):

| Variable | Where from |
|---|---|
| `PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase (publishable/anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase (secret key — server-side only) |
| `FOOTBALL_DATA_TOKEN` | football-data.org dashboard |
| `CRON_SECRET` | any long random string you choose |

### 3. Seed fixtures and run

```bash
npm run seed   # pulls all WC matches into the DB (re-run to refresh the bracket)
npm run dev
```

Log in with a magic link, enter your invite code on `/join`, and you're in.

## Tests

```bash
npm test                                        # API-parsing unit tests (Vitest)
node --env-file=.env scripts/verify-scoring.js  # checks every scoring tier against the real DB function
```

## Deploy (Vercel)

1. Push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new).
2. Add the same `.env` variables as Vercel environment variables.
3. Deploy, then add your Vercel URL to Supabase's Site URL + redirect URLs.
4. Score syncing runs via [`.github/workflows/sync-scores.yml`](.github/workflows/sync-scores.yml)
   every 15 minutes. Add `CRON_SECRET` as a GitHub Actions secret and set your
   deployed domain in the workflow's curl URL.

To target a different competition, change the football-data competition code
(`WC`) in `scripts/seed-matches.js` and `src/routes/api/cron-sync-scores/+server.js`.

## License

MIT — do whatever you like.
