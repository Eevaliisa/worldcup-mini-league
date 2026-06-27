<script>
  import Icon from '$lib/Icon.svelte';
  import Avatar from '$lib/Avatar.svelte';
  let { data } = $props();
</script>

<div class="wrap">
  <h1 class="page-title"><Icon name="trophy" size={26} /> Scoreboard</h1>

  {#if data.error}
    <p class="error">{data.error}</p>
  {/if}

  <table>
    <thead>
      <tr><th>#</th><th></th><th>Player</th><th>Points</th><th>Diff</th><th>Played</th></tr>
    </thead>
    <tbody>
      {#each data.scoreboard as row, i}
        <tr class:leader={i === 0 && Number(row.total_points) > 0}>
          <td>{i + 1}</td>
          <td><Avatar name={row.avatar} size={28} label={row.display_name} /></td>
          <td>{row.display_name}</td>
          <td class="points">{row.total_points}</td>
          <td class="diff">{row.total_score_diff}</td>
          <td>{row.matches_scored}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .wrap { max-width: 480px; margin: 0 auto; padding: 1.5rem 1rem; }
  .page-title { display: inline-flex; align-items: center; gap: 0.5rem; }
  .sub { font-size: 0.85rem; color: var(--muted); margin-top: -0.5rem; }
  table { width: 100%; border-collapse: collapse; }
  th { color: var(--muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.03em; }
  th, td { padding: 0.6rem 0.5rem; text-align: left; border-bottom: 1px solid var(--surface-border); }
  .points { font-weight: 700; color: var(--accent-bright); }
  .diff { color: var(--muted); font-size: 0.9rem; }

  .leader {
    background: var(--accent-glow-soft);
    box-shadow: inset 0 0 18px var(--accent-glow-soft);
  }
  .leader td:first-child { color: var(--gold); font-weight: 700; }
  .error { color: var(--error); }

  @media (max-width: 480px) {
    th, td { padding: 0.5rem 0.35rem; }
    th { font-size: 0.72rem; }
  }

  @media (max-width: 380px) {
    th:nth-child(6), td:nth-child(6) { display: none; }
  }
</style>
