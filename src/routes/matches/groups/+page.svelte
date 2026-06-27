<script>
  import Icon from '$lib/Icon.svelte';
  import Flag from '$lib/Flag.svelte';

  let { data } = $props();

  function kickoffLabel(iso) {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  }
</script>

<div class="wrap">
  <div class="page-head">
    <div class="head-text">
      <h1>Group Stage Results</h1>
      <p class="sub">Informational only — group matches aren't predicted or scored.</p>
    </div>
    <a class="back-link" href="/matches"><Icon name="ball" size={16} /> Back to predictions</a>
  </div>

  {#if data.matchesError}
    <p class="error">Couldn't load matches: {data.matchesError}</p>
  {/if}

  {#each data.matches as match (match.id)}
    {@const finished = match.status === 'finished'}
    <div class="row" class:finished>
      <span class="team home">
        {match.home_team} <Flag code={match.home_team_flag} name={match.home_team} />
      </span>
      <span class="mid">
        {#if finished}
          <span class="score">{match.home_fulltime} – {match.away_fulltime}</span>
        {:else}
          <span class="kickoff">{kickoffLabel(match.kickoff_time)}</span>
        {/if}
      </span>
      <span class="team away">
        <Flag code={match.away_team_flag} name={match.away_team} /> {match.away_team}
      </span>
    </div>
  {/each}
</div>

<style>
  .wrap { max-width: 640px; margin: 0 auto; padding: 1.5rem 1rem; }
  .page-head {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 1rem; flex-wrap: wrap;
  }
  .head-text { min-width: 0; }
  .back-link {
    flex: none;
    display: inline-flex; align-items: center; gap: 0.4rem;
    text-decoration: none; color: var(--accent-bright); font-weight: 600;
    font-size: 0.9rem; border: 1px solid var(--surface-border);
    border-radius: 999px; padding: 0.4rem 0.9rem; transition: all 0.15s ease;
  }
  .back-link:hover { border-color: var(--accent); box-shadow: var(--glow); }
  .sub { color: var(--muted); font-size: 0.9rem; margin: 0.25rem 0 0; }
  @media (max-width: 540px) {
    .page-head { flex-direction: column; gap: 0.85rem; }
  }
  .row {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.5rem;
    border-bottom: 1px solid var(--surface-border);
  }
  .team { display: inline-flex; align-items: center; gap: 0.4rem; min-width: 0; overflow-wrap: anywhere; }
  .team.home { justify-content: flex-end; text-align: right; }
  .team.away { justify-content: flex-start; }
  .mid { min-width: 7rem; text-align: center; }
  .score { font-weight: 700; }
  .kickoff { font-size: 0.8rem; color: var(--muted); }
  .row.finished .kickoff { display: none; }
  .error { color: var(--error); }

  @media (max-width: 480px) {
    .row { gap: 0.5rem; padding: 0.55rem 0.2rem; font-size: 0.85rem; }
    .mid { min-width: 4.5rem; }
  }
</style>
