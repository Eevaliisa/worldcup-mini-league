import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
  const { session, user } = await locals.safeGetSession();
  if (!session) throw redirect(303, '/login');

  const { data: memberships } = await locals.supabase
    .from('league_members')
    .select('league_id')
    .eq('user_id', user.id);

  if (memberships && memberships.length > 0) {
    throw redirect(303, '/matches');
  }

  return {};
}
