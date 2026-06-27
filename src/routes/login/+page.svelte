<script>
  import { createSupabaseBrowserClient } from '$lib/supabase-browser.js';
  import Icon from '$lib/Icon.svelte';

  const supabase = createSupabaseBrowserClient();

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  let email = $state('');
  let status = $state('idle'); // idle | sending | sent | error
  let errorMsg = $state('');

  let emailValid = $derived(EMAIL_RE.test(email.trim()));
  let showInvalid = $derived(email.trim().length > 0 && !emailValid);
  let canSend = $derived(emailValid && status !== 'sending');

  async function sendMagicLink(e) {
    e.preventDefault();
    if (!canSend) return;

    status = 'sending';
    errorMsg = '';
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`
      }
    });
    if (error) {
      status = 'error';
      errorMsg = error.message;
    } else {
      status = 'sent';
    }
  }
</script>

<div class="login-wrap">
  <h1 class="brand-title">
    <Icon name="ball" size={48} />
    <span>World Cup Mini League</span>
  </h1>
  <p>Enter your email and you'll get a magic link from Supabase.</p>

  {#if status === 'sent'}
    <p class="success">Check your inbox! Click the link to log in.</p>
  {:else}
    <form onsubmit={sendMagicLink} novalidate>
      <input
        type="email"
        bind:value={email}
        placeholder="you@example.com"
        autocomplete="email"
        aria-invalid={showInvalid}
        disabled={status === 'sending'}
      />
      {#if showInvalid}
        <p class="hint">Enter a valid email address (e.g. you@example.com).</p>
      {/if}
      <button type="submit" disabled={!canSend}>
        {status === 'sending' ? 'Sending…' : 'Send magic link'}
      </button>
    </form>
    {#if status === 'error'}
      <p class="error">{errorMsg}</p>
    {/if}
  {/if}

  <p class="note">
    First time here? Log in with the magic link, then enter your league's
    invite code on the next screen to join.
  </p>
</div>

<style>
  .login-wrap {
    max-width: 900px;
    margin: 4rem auto;
    text-align: center;
    padding: 0 1rem;
  }
  .brand-title {
    font-family: var(--font-title);
    font-weight: 400;
    white-space: nowrap;
    font-size: clamp(2rem, 8vw, 3rem);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    letter-spacing: 0.02em;
  }
  .login-wrap > p { max-width: 460px; margin-left: auto; margin-right: auto; }
  form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 1.5rem auto 0;
    max-width: 400px;
  }
  input {
    padding: 0.75rem;
    font-size: 1rem;
  }
  input[aria-invalid='true'] {
    border-color: var(--error);
  }
  button {
    padding: 0.75rem;
    font-size: 1rem;
    font-weight: 700;
    border-radius: var(--radius-sm);
    border: 1px solid var(--accent);
    background: var(--accent);
    color: #04222a;
    cursor: pointer;
    transition: box-shadow 0.18s ease, background 0.18s ease;
  }
  button:hover:not(:disabled) {
    background: var(--accent-bright);
    box-shadow: var(--glow-strong);
  }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  .success { color: var(--accent-bright); font-weight: 700; }
  .hint { color: var(--error); font-size: 0.8rem; margin: -0.25rem 0 0; text-align: left; }
  .error { color: var(--error); }
  .note { font-size: 0.85rem; color: var(--muted); margin-top: 2rem; }
</style>
