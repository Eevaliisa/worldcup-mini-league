<script>
  import { createSupabaseBrowserClient } from '$lib/supabase-browser.js';
  import Icon from '$lib/Icon.svelte';
  import Flag from '$lib/Flag.svelte';
  import HowItWorks from '$lib/HowItWorks.svelte';

  let { data } = $props();

  let knockoutMatches = $derived(data.matches.filter((m) => m.is_knockout));
  const supabase = createSupabaseBrowserClient();

  let predictionsByMatch = $state(data.predictionsByMatch);
  let savingId = $state(null);
  let usedMultiplierToday = $state(
    Object.values(data.predictionsByMatch).some(
      (p) => p.confidence_multiplier && isToday(p.updated_at)
    )
  );

  function isToday(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }

  function isLocked(match) {
    return new Date(match.kickoff_time) <= new Date();
  }

  function getDraft(matchId) {
    const existing = predictionsByMatch[matchId];
    return {
      home: existing?.home_fulltime_pred ?? '',
      away: existing?.away_fulltime_pred ?? '',
      outcomeType: existing?.outcome_type_pred ?? 'regulation',
      homePens: existing?.home_penalty_pred ?? '',
      awayPens: existing?.away_penalty_pred ?? '',
      hotTake: existing?.hot_take ?? ''
    };
  }

  let drafts = $state(
    Object.fromEntries(
      data.matches.filter((m) => m.is_knockout).map((m) => [m.id, getDraft(m.id)])
    )
  );

  async function savePrediction(match) {
    if (isLocked(match)) return;
    const draft = drafts[match.id];
    if (draft.home === '' || draft.away === '') return;
    if (draft.outcomeType === 'penalties' && (draft.homePens === '' || draft.awayPens === '')) {
      alert('Predicted penalties — add a penalty shootout score too.');
      return;
    }
    if (draft.outcomeType === 'penalties' && Number(draft.homePens) === Number(draft.awayPens)) {
      alert("Penalty shootouts can't end in a draw — pick a winner.");
      return;
    }

    savingId = match.id;

    const payload = {
      match_id: match.id,
      home_fulltime_pred: Number(draft.home),
      away_fulltime_pred: Number(draft.away),
      outcome_type_pred: draft.outcomeType,
      home_penalty_pred: draft.outcomeType === 'penalties' ? Number(draft.homePens) : null,
      away_penalty_pred: draft.outcomeType === 'penalties' ? Number(draft.awayPens) : null,
      hot_take: draft.hotTake || null,
      updated_at: new Date().toISOString()
    };

    const existing = predictionsByMatch[match.id];

    let result;
    if (existing) {
      result = await supabase
        .from('predictions')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      result = await supabase
        .from('predictions')
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();
    }

    if (!result.error) {
      predictionsByMatch = { ...predictionsByMatch, [match.id]: result.data };
    } else {
      alert('Could not save prediction: ' + result.error.message);
    }
    savingId = null;
  }

  async function useConfidenceMultiplier(match) {
    const existing = predictionsByMatch[match.id];
    if (!existing) {
      alert('Save a prediction for this match first.');
      return;
    }
    const { error } = await supabase.rpc('set_confidence_multiplier', {
      p_prediction_id: existing.id
    });
    if (error) {
      alert(error.message.includes('already used')
        ? "You've already used your confidence multiplier today!"
        : error.message);
      return;
    }
    predictionsByMatch = {
      ...predictionsByMatch,
      [match.id]: { ...existing, confidence_multiplier: true, updated_at: new Date().toISOString() }
    };
    usedMultiplierToday = true;
  }

  async function setReaction(match, reaction) {
    const existing = predictionsByMatch[match.id];
    if (!existing) return;
    const { error } = await supabase.rpc('set_reaction', {
      p_prediction_id: existing.id,
      p_reaction: reaction
    });
    if (!error) {
      predictionsByMatch = {
        ...predictionsByMatch,
        [match.id]: { ...existing, reaction }
      };
    }
  }

  const reactions = [
    { key: 'var_robbed', emoji: '🟥', label: 'VAR robbed me' },
    { key: 'called_it', emoji: '🔮', label: 'Called it' },
    { key: 'devastated', emoji: '💀', label: 'Devastated' },
    { key: 'chaos', emoji: '🌀', label: 'Pure chaos' },
    { key: 'offside_hairline', emoji: '📏', label: 'Offside by a hair' },
    { key: 'worth_it', emoji: '🍿', label: 'Worth the popcorn' },
    { key: 'time_wasting', emoji: '🐢', label: 'Time-wasting masterclass' },
    { key: 'keeper_heroics', emoji: '🧤', label: 'Keeper from another planet' },
    { key: 'striker_woes', emoji: '🫠', label: 'My striker forgot how feet work' },
    { key: 'ref_needs_glasses', emoji: '📵', label: 'Ref needs glasses' }
  ];

  const outcomeLabels = {
    regulation: '90 min',
    extra_time: 'Extra time',
    penalties: 'Penalties'
  };
</script>

<div class="wrap">
  <div class="page-head">
    <h1>Knockout Predictions</h1>
    <a class="group-link" href="/matches/groups"><Icon name="chart" size={16} /> Group stage results</a>
  </div>
  <p class="sub">Predict knockout matches before kickoff. Group results are on a separate page.</p>

  <HowItWorks />

  {#if data.matchesError}
    <p class="error">Couldn't load matches: {data.matchesError}</p>
  {/if}

  {#if knockoutMatches.length === 0}
    <p class="empty">No knockout matches yet — they appear here as the bracket fills in.</p>
  {/if}

  {#each knockoutMatches as match (match.id)}
    {@const locked = isLocked(match)}
    {@const finished = match.status === 'finished'}
    {@const existing = predictionsByMatch[match.id]}

    <div class="match-card" class:locked class:finished>
      <div class="match-header">
        <span class="teams">
          <Flag code={match.home_team_flag} name={match.home_team} /> {match.home_team}
          vs {match.away_team} <Flag code={match.away_team_flag} name={match.away_team} />
        </span>
        <span class="kickoff">
          {new Date(match.kickoff_time).toLocaleString(undefined, {
            weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
          })}
        </span>
      </div>

      {#if finished}
        <div class="final-score">
          Final: {match.home_fulltime} – {match.away_fulltime}
          {#if match.outcome_type && match.outcome_type !== 'regulation'}
            <span class="outcome-tag">({outcomeLabels[match.outcome_type]}{match.outcome_type === 'penalties' ? `, ${match.home_penalty}-${match.away_penalty} pens` : ''})</span>
          {/if}
        </div>
      {/if}

      {#if match.is_knockout}
        {#if locked && !finished}
          <p class="badge"><Icon name="lock" size={15} /> Locked — kicked off</p>
        {/if}

        {#if !locked}
          {@const draft = drafts[match.id]}
          <div class="predict-row">
            <input type="number" min="0" max="20" bind:value={draft.home} placeholder="0" />
            <span>–</span>
            <input type="number" min="0" max="20" bind:value={draft.away} placeholder="0" />
            <span class="reg-label">(90 min)</span>
          </div>

          <div class="outcome-row">
            <span class="outcome-label">Decided by:</span>
            {#each ['regulation', 'extra_time', 'penalties'] as ot}
              <button
                class="outcome-pill"
                class:selected={draft.outcomeType === ot}
                onclick={() => draft.outcomeType = ot}
              >
                {outcomeLabels[ot]}
              </button>
            {/each}
          </div>

          {#if draft.outcomeType === 'penalties'}
            <div class="predict-row pens-row">
              <span class="pens-label">Shootout:</span>
              <input type="number" min="0" max="20" bind:value={draft.homePens} placeholder="4" />
              <span>–</span>
              <input type="number" min="0" max="20" bind:value={draft.awayPens} placeholder="3" />
            </div>
          {/if}

          <input
            class="hot-take"
            type="text"
            bind:value={draft.hotTake}
            placeholder="Hot take (optional) — e.g. 'this is a banana skin game'"
            maxlength="140"
          />

          <div class="action-row">
            <button class="save-btn" onclick={() => savePrediction(match)} disabled={savingId === match.id}>
              {existing ? 'Update' : 'Predict'}
            </button>
            <button
              class="multiplier-btn"
              class:active={existing?.confidence_multiplier}
              disabled={usedMultiplierToday && !existing?.confidence_multiplier}
              onclick={() => useConfidenceMultiplier(match)}
            >
              <Icon name="flame" size={15} />
              {existing?.confidence_multiplier ? '2x active' : '2x Confidence (1/day)'}
            </button>
          </div>
        {/if}

        {#if existing && (locked || finished)}
          <p class="your-pick">
            Your pick: {existing.home_fulltime_pred}–{existing.away_fulltime_pred}
            ({outcomeLabels[existing.outcome_type_pred]}{existing.outcome_type_pred === 'penalties' ? `, ${existing.home_penalty_pred}-${existing.away_penalty_pred} pens` : ''})
            {#if existing.confidence_multiplier}<span class="mult-tag"><Icon name="flame" size={13} /> 2x</span>{/if}
          </p>
        {/if}

        {#if finished && existing}
          <div class="reactions">
            {#each reactions as r}
              <button
                class:selected={existing.reaction === r.key}
                onclick={() => setReaction(match, r.key)}
              >
                {r.emoji} {r.label}
              </button>
            {/each}
          </div>
        {/if}
      {/if}
    </div>
  {/each}
</div>

<style>
  .wrap { max-width: 640px; margin: 0 auto; padding: 1.5rem 1rem; }
  .page-head {
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem; flex-wrap: wrap;
  }
  .group-link {
    display: inline-flex; align-items: center; gap: 0.4rem;
    text-decoration: none; color: var(--accent-bright); font-weight: 600;
    font-size: 0.9rem; border: 1px solid var(--surface-border);
    border-radius: 999px; padding: 0.4rem 0.9rem; transition: all 0.15s ease;
  }
  .group-link:hover { border-color: var(--accent); box-shadow: var(--glow); }
  .sub { color: var(--muted); font-size: 0.9rem; margin-top: -0.25rem; }
  .empty { color: var(--muted); font-style: italic; }
  .match-card {
    background: var(--surface);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius);
    padding: 1rem;
    margin-bottom: 1rem;
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
  }
  .match-card:not(.locked):hover {
    border-color: var(--accent-bright);
    box-shadow: var(--glow-strong);
  }
  .match-card.locked:not(.finished) { opacity: 0.7; }
  .match-card.finished { border-color: rgba(34, 211, 238, 0.35); }
  .match-header { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; }
  .teams { font-weight: 600; }
  .kickoff { font-size: 0.85rem; color: var(--muted); }
  .badge {
    font-size: 0.85rem; color: var(--locked); margin: 0.5rem 0;
    display: inline-flex; align-items: center; gap: 0.35rem;
  }
  .badge :global(.glow-icon) { color: var(--locked); filter: none; }
  .final-score { font-weight: 700; margin: 0.5rem 0; }
  .outcome-tag { font-weight: 400; font-size: 0.85rem; color: var(--muted); }
  .predict-row { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.75rem; }
  .predict-row input[type="number"] {
    width: 3rem; text-align: center; padding: 0.5rem;
  }
  .reg-label { font-size: 0.8rem; color: var(--muted); margin-left: 0.25rem; }
  .outcome-row { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.6rem; flex-wrap: wrap; }
  .outcome-label { font-size: 0.85rem; color: var(--muted); }
  .outcome-pill {
    padding: 0.3rem 0.7rem; border-radius: 999px; border: 1px solid var(--surface-border);
    background: transparent; color: inherit; cursor: pointer; font-size: 0.85rem;
    transition: all 0.15s ease;
  }
  .outcome-pill:hover:not(.selected) {
    border-color: var(--accent); box-shadow: var(--glow-soft);
  }
  .outcome-pill.selected {
    background: var(--accent); border-color: var(--accent-bright); color: white;
    box-shadow: var(--glow);
  }
  .pens-row { margin-top: 0.5rem; }
  .pens-label { font-size: 0.85rem; color: var(--muted); }
  .hot-take {
    width: 100%; margin-top: 0.6rem; padding: 0.5rem; box-sizing: border-box;
  }
  .action-row { display: flex; gap: 0.5rem; margin-top: 0.6rem; flex-wrap: wrap; }
  .save-btn {
    padding: 0.5rem 1rem; border-radius: var(--radius-sm);
    border: 1px solid var(--accent); background: var(--accent); color: white; cursor: pointer;
    font-weight: 600; transition: box-shadow 0.18s ease, background 0.18s ease;
  }
  .save-btn:hover:not(:disabled) {
    background: var(--accent-bright); box-shadow: var(--glow-strong);
  }
  .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .multiplier-btn {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.4rem 0.8rem; border-radius: 999px;
    border: 1px solid var(--accent); background: transparent; color: var(--accent-bright);
    cursor: pointer; transition: all 0.15s ease;
  }
  .multiplier-btn:hover:not(:disabled) {
    box-shadow: var(--glow-soft);
  }
  .multiplier-btn.active {
    background: var(--accent); color: #04222a; box-shadow: var(--glow);
  }
  .multiplier-btn.active :global(.glow-icon) { color: #04222a; filter: none; }
  .multiplier-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .your-pick { font-size: 0.85rem; color: var(--muted); margin-top: 0.5rem; }
  .mult-tag {
    color: var(--accent-bright); margin-left: 0.4rem; font-weight: 600;
    display: inline-flex; align-items: center; gap: 0.2rem;
  }
  .reactions { display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap; }
  .reactions button {
    padding: 0.4rem 0.7rem; border-radius: 999px; border: 1px solid var(--surface-border);
    background: transparent; color: inherit; cursor: pointer; font-size: 0.85rem;
    transition: all 0.15s ease;
  }
  .reactions button:hover:not(.selected) { border-color: var(--accent); box-shadow: var(--glow-soft); }
  .reactions button.selected { background: var(--accent); border-color: var(--accent-bright); color: white; box-shadow: var(--glow); }
  .error { color: var(--error); }
</style>
