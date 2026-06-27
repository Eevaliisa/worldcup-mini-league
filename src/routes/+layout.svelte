<script>
  import '../app.css';
  import Icon from '$lib/Icon.svelte';
  import { injectAnalytics } from '@vercel/analytics/sveltekit';
  import { createSupabaseBrowserClient } from '$lib/supabase-browser.js';
  import { invalidate, afterNavigate } from '$app/navigation';
  import { onMount } from 'svelte';

  injectAnalytics();

  let { data, children } = $props();

  const supabase = createSupabaseBrowserClient();

  let menuOpen = $state(false);

  afterNavigate(() => (menuOpen = false));

  onMount(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.expires_at !== data.session?.expires_at) {
        invalidate('supabase:auth');
      }
    });
    return () => listener.subscription.unsubscribe();
  });
</script>

<nav class="topnav">
  <a class="brand" href="/matches"><Icon name="ball" size={20} /> <span>World Cup League</span></a>

  <button
    class="hamburger"
    aria-label="Menu"
    aria-expanded={menuOpen}
    aria-controls="nav-links"
    onclick={() => (menuOpen = !menuOpen)}
  >
    <Icon name={menuOpen ? 'close' : 'menu'} size={24} />
  </button>

  <div id="nav-links" class="links" class:open={menuOpen}>
    <a href="/matches"><Icon name="ball" size={18} /> Matches</a>
    <a href="/scoreboard"><Icon name="trophy" size={18} /> Scoreboard</a>
    <a href="/stats"><Icon name="chart" size={18} /> Fun Stats</a>
    <a href="/about"><Icon name="info" size={18} /> About</a>
    {#if data.user}
      <a href="/profile"><Icon name="user" size={18} /> Profile</a>
      <button class="logout" onclick={() => supabase.auth.signOut().then(() => location.reload())}>
        Log out
      </button>
    {/if}
  </div>
</nav>

{@render children?.()}

<style>
  .topnav {
    position: relative;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--surface-border);
    background: rgba(10, 10, 18, 0.6);
    backdrop-filter: blur(8px);
  }

  .brand {
    display: none;
    align-items: center;
    gap: 0.45rem;
    text-decoration: none;
    color: var(--text);
    font-weight: 700;
  }
  .hamburger {
    display: none;
    margin-left: auto;
    background: transparent;
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-sm);
    color: var(--text);
    padding: 0.3rem;
    cursor: pointer;
    line-height: 0;
  }
  .hamburger { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
  .hamburger:hover { border-color: var(--accent); box-shadow: var(--glow-soft); }

  .links {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 1.5rem;
  }
  .links a {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    text-decoration: none;
    color: var(--text);
    font-weight: 600;
    transition: color 0.15s ease, text-shadow 0.15s ease;
  }
  .links a:hover {
    color: var(--accent-bright);
    text-shadow: var(--glow-text);
  }
  .logout {
    margin-left: auto;
    cursor: pointer;
    background: transparent;
    color: var(--muted);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-sm);
    padding: 0.4rem 0.8rem;
    font-weight: 600;
    transition: color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .logout:hover { color: var(--accent-bright); border-color: var(--accent); box-shadow: var(--glow-soft); }
  .brand:hover { text-shadow: var(--glow-text); }

  @media (max-width: 540px) {
    .brand { display: inline-flex; }
    .hamburger { display: inline-flex; }

    .links {
      display: none;
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      flex-direction: column;
      align-items: stretch;
      gap: 0.25rem;
      padding: 0.5rem 0.9rem 0.9rem;
      background: var(--bg-elev);
      border-bottom: 1px solid var(--surface-border);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
      z-index: 20;
    }
    .links.open { display: flex; }
    .links a { padding: 0.6rem 0.25rem; }
    .logout { margin: 0.4rem 0 0; align-self: flex-start; }
  }
</style>
