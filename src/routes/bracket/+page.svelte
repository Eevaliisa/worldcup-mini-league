<script>
  import Icon from '$lib/Icon.svelte';
  import Flag from '$lib/Flag.svelte';

  let { data } = $props();

  const outcomeLabels = { extra_time: 'a.e.t.', penalties: 'pens' };

  const ROUNDS = [
    { key: 'round_of_32', label: 'R32' },
    { key: 'round_of_16', label: 'R16' },
    { key: 'quarter', label: 'Quarters' },
    { key: 'semi', label: 'Semis' },
    { key: 'final', label: 'Final' }
  ];

  const byStage = $derived.by(() => {
    const g = {};
    for (const m of data.matches) (g[m.stage] ??= []).push(m);
    return g;
  });
  const thirdPlace = $derived(byStage['third_place'] ?? []);

  let hovered = $state(null);
  let pinned = $state(null);
  const active = $derived(hovered ?? pinned);

  function teamsOf(m) {
    return [m.home_team, m.away_team].filter((t) => t && t !== 'TBD');
  }
  const activeTeams = $derived(active ? new Set(teamsOf(active)) : null);

  function linkState(m) {
    if (!active) return 'none';
    if (m.id === active.id) return 'active';
    if (activeTeams && teamsOf(m).some((t) => activeTeams.has(t))) return 'linked';
    return 'dim';
  }

  function toggle(m) {
    pinned = pinned?.id === m.id ? null : m;
  }

  function winner(m) {
    if (m.status !== 'finished' || m.home_fulltime == null || m.away_fulltime == null) return null;
    if (m.home_fulltime !== m.away_fulltime) return m.home_fulltime > m.away_fulltime ? 'home' : 'away';
    if (m.home_penalty != null && m.away_penalty != null) {
      return m.home_penalty > m.away_penalty ? 'home' : 'away';
    }
    return null;
  }

  function note(m) {
    if (m.status === 'live') return 'LIVE';
    if (m.status !== 'finished') {
      return new Date(m.kickoff_time).toLocaleString(undefined, { month: 'short', day: 'numeric' });
    }
    if (m.outcome_type === 'penalties') return `${outcomeLabels.penalties} ${m.home_penalty}–${m.away_penalty}`;
    if (m.outcome_type === 'extra_time') return outcomeLabels.extra_time;
    return null;
  }

  function scoreFor(m, side) {
    if (m.status !== 'finished') return '';
    return side === 'home' ? m.home_fulltime : m.away_fulltime;
  }
</script>

{#snippet teamRow(m, side, w)}
  <div class="brow" class:win={w === side} class:lose={w && w !== side}>
    <Flag code={side === 'home' ? m.home_team_flag : m.away_team_flag} name={side === 'home' ? m.home_team : m.away_team} />
    <span class="bname">{side === 'home' ? m.home_team : m.away_team}</span>
    <span class="bscore">{scoreFor(m, side)}</span>
  </div>
{/snippet}

{#snippet matchCard(m)}
  {@const w = winner(m)}
  {@const n = note(m)}
  {@const ls = linkState(m)}
  <div
    class="bmatch"
    class:finished={m.status === 'finished'}
    class:live={m.status === 'live'}
    class:active={ls === 'active'}
    class:linked={ls === 'linked'}
    class:dim={ls === 'dim'}
    role="button"
    tabindex="0"
    onmouseenter={() => (hovered = m)}
    onmouseleave={() => (hovered = null)}
    onfocusin={() => (hovered = m)}
    onfocusout={() => (hovered = null)}
    onclick={() => toggle(m)}
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(m); } }}
  >
    {@render teamRow(m, 'home', w)}
    {@render teamRow(m, 'away', w)}
    {#if n}<div class="bnote" class:live-note={m.status === 'live'}>{n}</div>{/if}
  </div>
{/snippet}

<div class="wrap">
  <div class="page-head">
    <div class="head-text">
      <h1 class="page-title"><Icon name="bracket" size={24} /> The Road to the Final</h1>
      <p class="sub">A quick overview — hover or tap a match to trace where its teams came from and go next.</p>
    </div>
    <a class="back-link" href="/matches"><Icon name="ball" size={16} /> Back to predictions</a>
  </div>

  {#if data.matchesError}
    <p class="error">Couldn't load matches: {data.matchesError}</p>
  {/if}

  {#if data.matches.length === 0}
    <p class="empty">No knockout matches yet — the bracket fills in as the group stage wraps up.</p>
  {:else}
    <div class="bracket">
      {#each ROUNDS as round}
        {@const games = byStage[round.key] ?? []}
        <div class="round">
          <h2 class="round-label">{round.label}</h2>
          <div class="games">
            {#if games.length === 0}
              <div class="bmatch tbd">TBD</div>
            {:else}
              {#each games as m (m.id)}
                {@render matchCard(m)}
              {/each}
            {/if}
          </div>
        </div>
      {/each}
    </div>

    {#if thirdPlace.length > 0}
      <div class="third">
        <h2 class="round-label">3rd-place playoff</h2>
        <div class="games">
          {#each thirdPlace as m (m.id)}
            {@render matchCard(m)}
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .wrap { max-width: 960px; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
  .page-head {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 1rem; flex-wrap: wrap;
  }
  .head-text { min-width: 0; }
  .page-title { display: inline-flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; }
  .sub { color: var(--muted); font-size: 0.9rem; margin: 0.25rem 0 0; max-width: 38rem; }
  .back-link {
    flex: none;
    display: inline-flex; align-items: center; gap: 0.4rem;
    text-decoration: none; color: var(--accent-bright); font-weight: 600;
    font-size: 0.9rem; border: 1px solid var(--surface-border);
    border-radius: 999px; padding: 0.4rem 0.9rem; transition: all 0.15s ease;
  }
  .back-link:hover { border-color: var(--accent); box-shadow: var(--glow); }
  .empty { color: var(--muted); font-style: italic; }
  .error { color: var(--error); }
  @media (max-width: 540px) {
    .page-head { flex-direction: column; gap: 0.85rem; }
  }

  .bracket {
    display: flex;
    gap: 0.5rem;
    margin-top: 1.5rem;
    overflow-x: auto;
    padding-bottom: 0.6rem;
  }
  .round {
    flex: 0 0 auto;
    width: 9.25rem;
  }
  .games {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .round-label {
    font-size: 0.62rem; font-weight: 700; color: var(--accent-bright);
    text-transform: uppercase; letter-spacing: 0.06em;
    margin: 0 0 0.35rem;
  }

  .third { margin-top: 1.5rem; width: 9.25rem; }

  .bmatch {
    background: var(--surface);
    border: 1px solid var(--surface-border);
    border-radius: 6px;
    padding: 0.3rem 0.4rem;
    cursor: pointer;
    transition: border-color 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease;
  }
  .bmatch:focus-visible { outline: none; }
  .bmatch.finished { border-color: rgba(248, 113, 113, 0.22); }
  .bmatch.live { border-color: rgba(245, 197, 24, 0.45); background: rgba(245, 197, 24, 0.07); }
  .bmatch.active { border-color: var(--accent-bright); box-shadow: var(--glow); }
  .bmatch.linked { border-color: var(--accent); box-shadow: var(--glow-soft); }
  .bmatch.dim { opacity: 0.3; }
  .bmatch.tbd {
    color: var(--muted); font-style: italic; font-size: 0.7rem;
    text-align: center; cursor: default;
  }

  .brow {
    display: flex; align-items: center; gap: 0.3rem;
    padding: 0.12rem 0;
    font-size: 0.72rem; line-height: 1.3;
  }
  .brow :global(.flag) { flex: none; }
  .bname { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bscore { flex: none; font-weight: 700; font-variant-numeric: tabular-nums; }
  .brow.win .bname, .brow.win .bscore { color: var(--accent-bright); font-weight: 700; }
  .brow.lose { opacity: 0.5; }

  .bnote {
    margin-top: 0.15rem; font-size: 0.6rem; color: var(--muted); text-align: center;
  }
  .bnote.live-note { color: var(--gold); font-weight: 700; letter-spacing: 0.05em; }

  @media (max-width: 640px) {
    .bracket {
      flex-direction: column;
      overflow-x: visible;
      gap: 1.25rem;
    }
    .round, .third { width: 100%; }
    .games {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
      gap: 0.5rem;
    }
    .round-label {
      font-size: 0.72rem;
      padding-bottom: 0.3rem;
      border-bottom: 1px solid var(--surface-border);
    }
  }
</style>
