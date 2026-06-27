// One-off (re-runnable) seed: pulls every FIFA World Cup match from
// football-data.org and upserts it into the `matches` table.
//
// Run with:  node --env-file=.env scripts/seed-matches.js
//
// Idempotent: keyed on external_id, so re-running it refreshes results and
// fills in knockout team names as the bracket fills out. Uses the Supabase
// service-role key (server-side only) to bypass RLS for the write.

import { createClient } from '@supabase/supabase-js';
import { mapMatchToRow } from '../src/lib/fixtures.js';

const TOKEN = process.env.FOOTBALL_DATA_TOKEN;
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TOKEN) throw new Error('FOOTBALL_DATA_TOKEN missing in .env');
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Supabase URL / service-role key missing in .env');

const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
  headers: { 'X-Auth-Token': TOKEN }
});
if (!res.ok) {
  throw new Error(`football-data.org returned HTTP ${res.status}: ${await res.text()}`);
}
const payload = await res.json();
const matches = Array.isArray(payload.matches) ? payload.matches : [];
console.log(`Fetched ${matches.length} matches from football-data.org`);

const rows = matches.map((m) => mapMatchToRow(m)).filter(Boolean);
const skipped = matches.length - rows.length;
const knockouts = rows.filter((r) => r.is_knockout).length;
console.log(`Mapped ${rows.length} rows (${knockouts} knockout, ${rows.length - knockouts} group)` +
  (skipped ? `, skipped ${skipped} unparseable` : ''));

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const { error, count } = await supabase
  .from('matches')
  .upsert(rows, { onConflict: 'external_id', count: 'exact' });

if (error) {
  console.error('Upsert failed:', error.message);
  process.exit(1);
}

console.log(`✓ Upserted ${count ?? rows.length} matches into the database.`);
