import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
  const { session, user } = await locals.safeGetSession();
  if (!session) throw redirect(303, '/login');

  const { data: memberships } = await locals.supabase
    .from('league_members')
    .select('league_id')
    .eq('user_id', user.id)
    .limit(1);

  if (!memberships || memberships.length === 0) {
    throw redirect(303, '/join');
  }

  const { data: matches, error } = await locals.supabase
    .from('matches')
    .select('*')
    .eq('is_knockout', false)
    .order('kickoff_time', { ascending: true });

  return { matches: matches ?? [], matchesError: error?.message ?? null };
}
