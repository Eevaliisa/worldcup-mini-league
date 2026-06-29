<script>
  import Icon from '$lib/Icon.svelte';
  import Flag from '$lib/Flag.svelte';
  import Avatar from '$lib/Avatar.svelte';

  let { data } = $props();

  const outcomeLabels = { regulation: '90 min', extra_time: 'Extra time', penalties: 'Penalties' };

  const noPredQuips = [
    'ghosted this one 👻',
    'was probably asleep 😴',
    'chickened out 🐔',
    'mysteriously silent 🤐',
    'forgot we have a league 🙈',
    'left it to fate 🎲',
    'too cool to guess 😎',
    'crickets 🦗'
  ];

  // Players sorted by name — everyone in the league shows up, pick or no pick.
  const members = $derived(
    [...data.profiles].sort((a, b) =>
      (a.display_name ?? '').localeCompare(b.display_name ?? '')
    )
  );

  // match_id -> (user_id -> prediction)
  const predByMatchUser = $derived.by(() => {
    const map = {};
    for (const p of data.predictions) {
      (map[p.match_id] ??= {})[p.user_id] = p;
    }
    return map;
  });

  function kickoffLabel(iso) {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric'
    });
  }
</script>

<div class="wrap">
  <div class="page-head">
    <div class="head-text">
      <h1 class="page-title"><Icon name="target" size={24} /> What did we predict?</h1>
      <p class="sub">Everyone's picks for each finished knockout match, next to what actually happened.</p>
    </div>
    <a class="back-link" href="/matches"><Icon name="ball" size={16} /> Back to predictions</a>
  </div>

  {#if data.matchesError}
    <p class="error">Couldn't load matches: {data.matchesError}</p>
  {/if}

  {#if data.matches.length === 0}
    <p class="empty">Nothing to recap yet — come back once a knockout match has finished.</p>
  {/if}

  {#each data.matches as match, mi (match.id)}
    <div class="match-card">
      <div class="result">
        <span class="team home">
          <Flag code={match.home_team_flag} name={match.home_team} /> {match.home_team}
        </span>
        <span class="score">
          {match.home_fulltime}–{match.away_fulltime}
          {#if match.outcome_type && match.outcome_type !== 'regulation'}
            <span class="outcome">({outcomeLabels[match.outcome_type]}{match.outcome_type === 'penalties' ? `, ${match.home_penalty}-${match.away_penalty} pens` : ''})</span>
          {/if}
        </span>
        <span class="team away">
          {match.away_team} <Flag code={match.away_team_flag} name={match.away_team} />
        </span>
      </div>
      <p class="kickoff">{kickoffLabel(match.kickoff_time)}</p>

      <ul class="picks">
        {#each members as member, ui}
          {@const pred = predByMatchUser[match.id]?.[member.id]}
          <li class="pick" class:mine={member.id === data.currentUserId}>
            <span class="who">
              <Avatar name={member.avatar} size={26} />
              <span class="name">{member.display_name ?? 'Someone'}</span>
            </span>
            {#if pred}
              {@const exact = pred.home_fulltime_pred === match.home_fulltime && pred.away_fulltime_pred === match.away_fulltime}
              <span class="guess">
                <span class="guess-score">{pred.home_fulltime_pred}–{pred.away_fulltime_pred}</span>
                {#if pred.outcome_type_pred && pred.outcome_type_pred !== 'regulation'}
                  <span class="outcome">({outcomeLabels[pred.outcome_type_pred]}{pred.outcome_type_pred === 'penalties' ? `, ${pred.home_penalty_pred}-${pred.away_penalty_pred} pens` : ''})</span>
                {/if}
                {#if pred.confidence_multiplier}<span class="mult"><Icon name="flame" size={12} /> 2x</span>{/if}
                {#if exact}<span class="exact"><Icon name="check" size={12} /> nailed it</span>{/if}
              </span>
            {:else}
              <span class="missed">{noPredQuips[(mi + ui) % noPredQuips.length]}</span>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {/each}
</div>

<style>
  .wrap { max-width: 640px; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
  .page-head {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 1rem; flex-wrap: wrap;
  }
  .head-text { min-width: 0; }
  .page-title { display: inline-flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; }
  .sub { color: var(--muted); font-size: 0.9rem; margin: 0.25rem 0 0; }
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

  .match-card {
    background: var(--surface);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius);
    padding: 1rem;
    margin-top: 1rem;
  }
  .result {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 0.75rem;
    font-weight: 700;
  }
  .team { display: inline-flex; align-items: center; gap: 0.4rem; min-width: 0; overflow-wrap: anywhere; }
  .team.home { justify-content: flex-end; text-align: right; }
  .team.away { justify-content: flex-start; }
  .score { white-space: nowrap; text-align: center; }
  .score .outcome { display: block; font-weight: 400; font-size: 0.75rem; color: var(--muted); }
  .kickoff { font-size: 0.8rem; color: var(--muted); text-align: center; margin: 0.35rem 0 0.75rem; }

  .picks { list-style: none; margin: 0; padding: 0; }
  .pick {
    display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
    padding: 0.45rem 0.25rem;
    border-top: 1px solid var(--surface-border);
    font-size: 0.9rem;
  }
  .pick.mine { background: var(--accent-glow-soft); border-radius: var(--radius-sm); padding-left: 0.5rem; padding-right: 0.5rem; }
  .who { display: inline-flex; align-items: center; gap: 0.5rem; min-width: 0; }
  .who :global(.avatar) { flex: none; }
  .name { font-weight: 600; overflow-wrap: anywhere; }
  .guess { display: inline-flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; justify-content: flex-end; text-align: right; }
  .guess-score { font-weight: 700; }
  .guess .outcome { font-size: 0.78rem; color: var(--muted); }
  .mult {
    display: inline-flex; align-items: center; gap: 0.15rem;
    color: var(--accent-bright); font-weight: 600; font-size: 0.78rem;
  }
  .mult :global(.glow-icon) { color: var(--accent-bright); filter: none; }
  .exact {
    display: inline-flex; align-items: center; gap: 0.15rem;
    color: var(--gold); font-weight: 700; font-size: 0.78rem;
  }
  .exact :global(.glow-icon) { color: var(--gold); filter: none; }
  .missed { color: var(--muted); font-style: italic; text-align: right; }
</style>
