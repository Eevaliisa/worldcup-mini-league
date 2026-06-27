// Integration check for the real calculate_match_scores() Postgres function.
//
//   node --env-file=.env scripts/verify-scoring.js
//
// For each scoring tier it inserts a synthetic finished knockout match + one
// prediction crafted to land in that tier, runs the actual scoring function,
// and asserts the awarded points/breakdown. Self-cleaning: all synthetic rows
// use external_id 'TEST-SCORING-*' and are deleted at the start and end (the
// FK cascade removes the predictions + scores too).

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// Use any existing profile as the predictor (service role bypasses RLS).
const { data: profile } = await supabase.from('profiles').select('id').limit(1).single();
if (!profile) {
  console.error('No profile found — log into the app once first so a profile exists.');
  process.exit(1);
}
const userId = profile.id;

// result: [homeFt, awayFt, outcome, homePen, awayPen]
// pred:   [homeFtPred, awayFtPred, outcomePred, homePenPred, awayPenPred, confidence]
const cases = [
  { label: 'exact score + pens',  result: [1, 1, 'penalties', 4, 3],   pred: [1, 1, 'penalties', 4, 3, false], pts: 7,   bd: 'exact_score_and_pens' },
  { label: 'exact score',         result: [2, 1, 'regulation', null, null], pred: [2, 1, 'regulation', null, null, false], pts: 5, bd: 'exact_score' },
  { label: 'outcome + diff',      result: [2, 0, 'regulation', null, null], pred: [3, 1, 'regulation', null, null, false], pts: 3, bd: 'outcome_and_diff' },
  { label: 'outcome + winner',    result: [2, 0, 'regulation', null, null], pred: [1, 0, 'regulation', null, null, false], pts: 2, bd: 'outcome_and_winner' },
  { label: 'one team goals',      result: [2, 0, 'regulation', null, null], pred: [2, 3, 'regulation', null, null, false], pts: 1, bd: 'one_team_bonus' },
  { label: 'called penalties',    result: [1, 1, 'penalties', 4, 3],   pred: [0, 2, 'penalties', 1, 3, false], pts: 0.5, bd: 'called_penalties' },
  { label: 'wrong',               result: [2, 0, 'regulation', null, null], pred: [0, 3, 'regulation', null, null, false], pts: 0, bd: 'wrong' },
  { label: 'confidence 2x (exact)', result: [2, 1, 'regulation', null, null], pred: [2, 1, 'regulation', null, null, true], pts: 10, bd: 'exact_score' }
];

async function cleanup() {
  await supabase.from('matches').delete().like('external_id', 'TEST-SCORING-%');
}

await cleanup();

let passed = 0;
for (let i = 0; i < cases.length; i++) {
  const c = cases[i];
  const [hf, af, ot, hp, ap] = c.result;
  const [hfp, afp, otp, hpp, app, conf] = c.pred;

  const { data: match, error: mErr } = await supabase.from('matches').insert({
    external_id: `TEST-SCORING-${i}`,
    home_team: 'Test A', away_team: 'Test B',
    kickoff_time: '2020-01-01T00:00:00Z',
    stage: 'final', is_knockout: true, status: 'finished',
    home_fulltime: hf, away_fulltime: af, outcome_type: ot, home_penalty: hp, away_penalty: ap
  }).select('id').single();
  if (mErr) { console.error(`✗ ${c.label}: match insert failed: ${mErr.message}`); continue; }

  const { error: pErr } = await supabase.from('predictions').insert({
    match_id: match.id, user_id: userId,
    home_fulltime_pred: hfp, away_fulltime_pred: afp, outcome_type_pred: otp,
    home_penalty_pred: hpp, away_penalty_pred: app, confidence_multiplier: conf
  });
  if (pErr) { console.error(`✗ ${c.label}: prediction insert failed: ${pErr.message}`); continue; }

  const { error: sErr } = await supabase.rpc('calculate_match_scores', { p_match_id: match.id });
  if (sErr) { console.error(`✗ ${c.label}: scoring rpc failed: ${sErr.message}`); continue; }

  const { data: score } = await supabase
    .from('scores').select('points, breakdown').eq('match_id', match.id).eq('user_id', userId).single();

  const gotPts = Number(score?.points);
  const ok = gotPts === c.pts && score?.breakdown === c.bd;
  console.log(`${ok ? '✓' : '✗'} ${c.label.padEnd(20)} expected ${c.pts} (${c.bd}), got ${gotPts} (${score?.breakdown})`);
  if (ok) passed++;
}

await cleanup();

console.log(`\n${passed}/${cases.length} scoring tiers correct`);
process.exit(passed === cases.length ? 0 : 1);
