<script>
  import { createSupabaseBrowserClient } from '$lib/supabase-browser.js';
  import Avatar, { AVATAR_KEYS } from '$lib/Avatar.svelte';

  let { data } = $props();
  const supabase = createSupabaseBrowserClient();

  let displayName = $state(data.profile?.display_name ?? '');
  let avatar = $state(data.profile?.avatar ?? 'fox');
  let status = $state('idle'); // idle | saving | saved | error
  let errorMsg = $state('');

  async function saveProfile(e) {
    e.preventDefault();
    if (!displayName.trim()) return;
    status = 'saving';

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim(), avatar })
      .eq('id', data.profile.id);

    if (error) {
      status = 'error';
      errorMsg = error.message;
    } else {
      status = 'saved';
      setTimeout(() => { if (status === 'saved') status = 'idle'; }, 2000);
    }
  }
</script>

<div class="wrap">
  <h1>Your profile</h1>
  <p class="sub">This is what shows up on the scoreboard and fun stats.</p>

  <form onsubmit={saveProfile}>
    <label>
      Username
      <input type="text" bind:value={displayName} maxlength="24" required />
    </label>

    <div class="field">
      <span class="field-label">Avatar</span>
      <div class="avatar-grid">
        {#each AVATAR_KEYS as key}
          <button
            type="button"
            class="avatar-btn"
            class:selected={avatar === key}
            aria-pressed={avatar === key}
            aria-label={key}
            onclick={() => avatar = key}
          >
            <Avatar name={key} size={52} />
          </button>
        {/each}
      </div>
    </div>

    <button type="submit" class="save" disabled={status === 'saving'}>
      {status === 'saving' ? 'Saving…' : status === 'saved' ? '✓ Saved' : 'Save changes'}
    </button>

    {#if status === 'error'}
      <p class="error">{errorMsg}</p>
    {/if}
  </form>
</div>

<style>
  .wrap { max-width: 420px; margin: 0 auto; padding: 1.5rem 1rem; }
  .sub { font-size: 0.85rem; color: var(--muted); margin-top: -0.5rem; }
  form { display: flex; flex-direction: column; gap: 1.25rem; margin-top: 1.5rem; }
  label { display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.9rem; }
  .field { display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.9rem; }
  .field-label { font-size: 0.9rem; }
  input {
    padding: 0.75rem; font-size: 1rem;
  }
  .avatar-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
  }
  .avatar-btn {
    aspect-ratio: 1;
    width: 100%;
    padding: 3px;
    border-radius: 50%;
    border: 2px solid transparent;
    background: transparent;
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
  }
  .avatar-btn:hover { transform: translateY(-1px); box-shadow: var(--glow-soft); }
  .avatar-btn.selected {
    border-color: var(--accent);
    box-shadow: var(--glow);
  }
  .avatar-btn :global(.avatar) { width: 100%; height: 100%; }
  .save {
    padding: 0.75rem; font-size: 1rem; font-weight: 700; border-radius: var(--radius-sm);
    border: 1px solid var(--accent); background: var(--accent); color: #04222a; cursor: pointer;
    transition: box-shadow 0.18s ease, background 0.18s ease;
  }
  .save:hover:not(:disabled) {
    background: var(--accent-bright); box-shadow: var(--glow-strong);
  }
  .save:disabled { opacity: 0.5; cursor: not-allowed; }
  .error { color: var(--error); }
</style>
