import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY, FOOTBALL_DATA_TOKEN, CRON_SECRET } from '$env/static/private';
import { mapMatchToRow } from '$lib/fixtures.js';

const WC_MATCHES_URL = 'https://api.football-data.org/v4/competitions/WC/matches';

export async function GET({ request }) {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  const { data: before, error: beforeErr } = await supabase
    .from('matches')
    .select('id, external_id, status, is_knockout');
  if (beforeErr) return json({ error: beforeErr.message }, { status: 500 });

  const prev = new Map((before ?? []).map((m) => [m.external_id, m]));

  const res = await fetch(WC_MATCHES_URL, { headers: { 'X-Auth-Token': FOOTBALL_DATA_TOKEN } });
  if (!res.ok) {
    return json({ error: `football-data.org HTTP ${res.status}` }, { status: 502 });
  }
  const payload = await res.json();
  const rows = (Array.isArray(payload.matches) ? payload.matches : [])
    .map((m) => mapMatchToRow(m))
    .filter(Boolean);

  if (rows.length === 0) {
    return json({ synced: 0, scored: 0, message: 'No matches returned' });
  }

  const { error: upErr } = await supabase
    .from('matches')
    .upsert(rows, { onConflict: 'external_id' });
  if (upErr) return json({ error: upErr.message }, { status: 500 });

  let scored = 0;
  const scoreErrors = [];
  for (const row of rows) {
    const wasFinished = prev.get(row.external_id)?.status === 'finished';
    if (row.is_knockout && row.status === 'finished' && !wasFinished) {
      const { data: m } = await supabase
        .from('matches')
        .select('id')
        .eq('external_id', row.external_id)
        .single();
      if (m) {
        const { error: scoreErr } = await supabase.rpc('calculate_match_scores', { p_match_id: m.id });
        if (scoreErr) scoreErrors.push({ external_id: row.external_id, error: scoreErr.message });
        else scored++;
      }
    }
  }

  return json({ synced: rows.length, scored, ...(scoreErrors.length ? { scoreErrors } : {}) });
}
