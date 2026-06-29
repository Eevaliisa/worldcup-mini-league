import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
  const { session, user } = await locals.safeGetSession();
  if (!session) throw redirect(303, '/login');

  // Same league gate as the matches page.
  const { data: memberships } = await locals.supabase
    .from('league_members')
    .select('league_id')
    .eq('user_id', user.id);

  if (!memberships || memberships.length === 0) {
    throw redirect(303, '/join');
  }

  const leagueIds = memberships.map((m) => m.league_id);

  // Everyone in the same league(s) — these are the players we expect a pick from.
  const { data: memberRows } = await locals.supabase
    .from('league_members')
    .select('user_id')
    .in('league_id', leagueIds);

  const memberIds = [...new Set((memberRows ?? []).map((m) => m.user_id))];

  const { data: profiles } = await locals.supabase
    .from('profiles')
    .select('id, display_name, avatar')
    .in('id', memberIds);

  // Finished knockout matches only — newest first.
  const { data: matches, error: matchesError } = await locals.supabase
    .from('matches')
    .select('*')
    .eq('is_knockout', true)
    .eq('status', 'finished')
    .order('kickoff_time', { ascending: false });

  const matchIds = (matches ?? []).map((m) => m.id);

  // Everyone's predictions for those matches. RLS only returns predictions for
  // matches that have kicked off, so finished matches are fully visible here.
  let predictions = [];
  if (matchIds.length > 0) {
    const { data: preds } = await locals.supabase
      .from('predictions')
      .select('*')
      .in('match_id', matchIds);
    predictions = preds ?? [];
  }

  return {
    matches: matches ?? [],
    profiles: profiles ?? [],
    predictions,
    matchesError: matchesError?.message ?? null,
    currentUserId: user.id
  };
}
