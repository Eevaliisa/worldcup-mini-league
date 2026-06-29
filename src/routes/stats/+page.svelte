<script>
  import Icon from '$lib/Icon.svelte';
  let { data } = $props();

  const LAZY_SLOTH_MIN_MATCHES = 5;

  const reactionEmoji = {
    var_robbed: '🟥', called_it: '🔮', devastated: '💀', chaos: '🌀',
    offside_hairline: '📏', time_wasting: '🐢',
    keeper_heroics: '🧤', striker_woes: '🫠',
    ref_needs_glasses: '📵', worth_it: '🍿'
  };
  const reactionLabel = {
    var_robbed: 'VAR robbed me', called_it: 'Called it', devastated: 'Devastated',
    chaos: 'Pure chaos', offside_hairline: 'Offside by a hair',
    time_wasting: 'Time-wasting masterclass', keeper_heroics: 'Keeper from another planet',
    striker_woes: 'My striker forgot how feet work',
    ref_needs_glasses: 'Ref needs glasses', worth_it: 'Worth the popcorn'
  };
</script>

<div class="wrap">
  <h1 class="page-title"><Icon name="chart" size={26} /> Fun Stats</h1>

  <section>
    <h2><Icon name="target" size={20} /> Biggest Upset Predictors</h2>
    <p class="sub">Called a correct outcome in a match decided by 2+ goals.</p>
    {#if data.upsets.length === 0}
      <p class="empty">No upsets correctly called yet.</p>
    {/if}
    {#each data.upsets as u}
      <div class="stat-row">
        <strong>{u.display_name}</strong> predicted {u.home_fulltime_pred}–{u.away_fulltime_pred}
        for {u.home_team} vs {u.away_team} (actual: {u.home_fulltime}–{u.away_fulltime})
      </div>
    {/each}
  </section>

  <section>
    <h2><Icon name="sparkles" size={20} /> Shootout Psychics</h2>
    <p class="sub">Called penalties AND got the exact shootout score right.</p>
    {#if data.shootoutPsychics.length === 0}
      <p class="empty">Nobody's pulled this off yet.</p>
    {/if}
    {#each data.shootoutPsychics as s}
      <div class="stat-row">
        <strong>{s.display_name}</strong> called {s.home_penalty_pred}-{s.away_penalty_pred} pens
        for {s.home_team} vs {s.away_team} — nailed it exactly.
      </div>
    {/each}
  </section>

  <section>
    <h2><Icon name="ghost" size={20} /> Most Delusional Predictors</h2>
    <p class="sub">The players whose predictions landed furthest from reality — top 3, one wild miss each.</p>
    {#if data.delusional.length === 0}
      <p class="empty">Nobody's gone mad yet.</p>
    {/if}
    {#each data.delusional as d, i}
      <div class="stat-row">
        <span class="rank">#{i + 1}</span>
        <strong>{d.display_name}</strong> said {d.home_fulltime_pred}–{d.away_fulltime_pred}
        for {d.home_team} vs {d.away_team} (actual: {d.home_fulltime}–{d.away_fulltime})
      </div>
    {/each}
  </section>

  <section>
    <h2><Icon name="moon" size={20} /> The Lazy Sloth</h2>
    <p class="sub">Registered, but can't be bothered to click on predictions.</p>
    {#if data.lockedKnockouts >= LAZY_SLOTH_MIN_MATCHES && data.lazySloths.length > 0}
      {#each data.lazySloths as s}
        <div class="stat-row">
          <strong>{s.display_name}</strong> predicted only {s.predicted} of {s.lockable_matches}
          knockout matches so far. 🦥
        </div>
      {/each}
    {:else}
      <p class="empty">No sloths spotted yet. Everyone's keeping up so far.</p>
    {/if}
  </section>

  <section>
    <h2><Icon name="masks" size={20} /> Reaction Leaderboard</h2>
    <p class="sub">How we're feeling after the matches?</p>
    {#if data.reactions.length === 0}
      <p class="empty">Nobody's reacted to anything yet.</p>
    {/if}
    {#each data.reactions as r}
      <div class="stat-row">
        <strong>{r.display_name}</strong> — {reactionEmoji[r.reaction] ?? ''} {reactionLabel[r.reaction] ?? r.reaction} ×{r.reaction_count}
      </div>
    {/each}
  </section>

</div>

<style>
  .wrap { max-width: 600px; margin: 0 auto; padding: 1.5rem 1rem; }
  section { margin-bottom: 2rem; }
  .page-title { display: inline-flex; align-items: center; gap: 0.5rem; }
  h2 { color: var(--accent-bright); display: inline-flex; align-items: center; gap: 0.5rem; }
  .sub { font-size: 0.85rem; color: var(--muted); margin-top: -0.25rem; }
  .stat-row { padding: 0.5rem 0; border-bottom: 1px solid var(--surface-border); }
  .stat-row strong { color: var(--text); }
  .rank { color: var(--accent-bright); font-weight: 700; margin-right: 0.35rem; }
  .empty { color: var(--muted); font-style: italic; }
</style>
