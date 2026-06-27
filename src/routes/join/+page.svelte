<script>
  import { createSupabaseBrowserClient } from '$lib/supabase-browser.js';
  import Icon from '$lib/Icon.svelte';
  import { goto } from '$app/navigation';

  const supabase = createSupabaseBrowserClient();

  let code = $state('');
  let username = $state('');
  let status = $state('idle'); // idle | joining | error
  let errorMsg = $state('');

  async function joinLeague(e) {
    e.preventDefault();
    if (!code.trim()) return;
    status = 'joining';

    const { error: joinError } = await supabase.rpc('join_league_with_code', {
      p_invite_code: code.trim().toUpperCase()
    });

    if (joinError) {
      status = 'error';
      errorMsg = joinError.message.includes('Invalid invite code')
        ? "That code doesn't match any league — double check it and try again."
        : joinError.message;
      return;
    }

    if (username.trim()) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('profiles')
        .update({ display_name: username.trim() })
        .eq('id', user.id);
    }

    goto('/matches');
  }
</script>

<div class="join-wrap">
  <h1 class="join-title"><Icon name="ball" size={26} /> Join the League</h1>
  <p>Ask whoever invited you for the league's invite code.</p>

  <form onsubmit={joinLeague}>
    <label>
      Invite code
      <input
        type="text"
        bind:value={code}
        placeholder="e.g. WC2026FRIENDS"
        required
        disabled={status === 'joining'}
        autocomplete="off"
      />
    </label>

    <label>
      Pick a username <span class="optional">(optional — shows on the scoreboard)</span>
      <input
        type="text"
        bind:value={username}
        placeholder="e.g. GoalDigger99"
        maxlength="24"
        disabled={status === 'joining'}
      />
    </label>

    <button type="submit" disabled={status === 'joining'}>
      {status === 'joining' ? 'Joining…' : 'Join league'}
    </button>

    {#if status === 'error'}
      <p class="error">{errorMsg}</p>
    {/if}
  </form>
</div>

<style>
  .join-wrap {
    max-width: 380px;
    margin: 4rem auto;
    text-align: center;
    padding: 0 1rem;
  }
  .join-title {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1.5rem;
    text-align: left;
  }
  label { display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.9rem; }
  .optional { font-weight: 400; opacity: 0.6; font-size: 0.8rem; }
  input {
    padding: 0.75rem;
    font-size: 1rem;
  }
  button {
    padding: 0.75rem;
    font-size: 1rem;
    font-weight: 600;
    border-radius: var(--radius-sm);
    border: 1px solid var(--accent);
    background: var(--accent);
    color: white;
    cursor: pointer;
    transition: box-shadow 0.18s ease, background 0.18s ease;
  }
  button:hover:not(:disabled) {
    background: var(--accent-bright);
    box-shadow: var(--glow-strong);
  }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  .error { color: var(--error); text-align: center; }
</style>
