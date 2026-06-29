import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
  const { session } = await locals.safeGetSession();
  if (!session) throw redirect(303, '/login');

  const [upsets, delusional, reactions, shootoutPsychics, lazySloths, lockedKo] = await Promise.all([
    locals.supabase.from('fun_stat_biggest_upset').select('*').limit(5),
    locals.supabase
      .from('fun_stat_most_delusional')
      .select('*')
      .order('delusion_score', { ascending: false })
      .limit(200),
    locals.supabase.from('fun_stat_reaction_counts').select('*').limit(10),
    locals.supabase.from('fun_stat_shootout_psychic').select('*').limit(5),
    locals.supabase.from('fun_stat_lazy_sloth').select('*').limit(5),
    locals.supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .eq('is_knockout', true)
      .lte('kickoff_time', new Date().toISOString())
  ]);

  const mostDelusional = [];
  const seenUsers = new Set();
  for (const row of delusional.data ?? []) {
    if (seenUsers.has(row.user_id)) continue;
    seenUsers.add(row.user_id);
    mostDelusional.push(row);
    if (mostDelusional.length === 3) break;
  }

  return {
    upsets: upsets.data ?? [],
    delusional: mostDelusional,
    reactions: reactions.data ?? [],
    shootoutPsychics: shootoutPsychics.data ?? [],
    lazySloths: lazySloths.data ?? [],
    lockedKnockouts: lockedKo.count ?? 0
  };
}
