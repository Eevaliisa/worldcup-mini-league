import { redirect } from '@sveltejs/kit';

export async function GET({ url, locals }) {
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/join';

  if (code) {
    const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      throw redirect(303, next);
    }
  }

  throw redirect(303, '/login?error=auth_failed');
}
