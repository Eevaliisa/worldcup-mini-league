import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
  const { session, user } = await locals.safeGetSession();
  if (!session) throw redirect(303, '/login');

  const { data: profile } = await locals.supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return { profile };
}
