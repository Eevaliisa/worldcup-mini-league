import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
  const { session } = await locals.safeGetSession();
  if (!session) throw redirect(303, '/login');

  const { data: scoreboard, error } = await locals.supabase
    .from('scoreboard')
    .select('*');

  return { scoreboard: scoreboard ?? [], error: error?.message ?? null };
}
