<script>
  import { createSupabaseBrowserClient } from '$lib/supabase-browser.js';
  import Icon from '$lib/Icon.svelte';
  import Flag from '$lib/Flag.svelte';
  import HowItWorks from '$lib/HowItWorks.svelte';

  let { data } = $props();

  let knockoutMatches = $derived(data.matches.filter((m) => m.is_knockout));
  const supabase = createSupabaseBrowserClient();

  // Finished matches are shown by default; the user can hide them with one click.
  let showFinished = $state(true);
  let hasFinished = $derived(knockoutMatches.some((m) => m.status === 'finished'));
  let visibleMatches = $derived(
    showFinished ? knockoutMatches : knockoutMatches.filter((m) => m.status !== 'finished')
  );

  let predictionsByMatch = $state(data.predictionsByMatch);
  let savingId = $state(null);
  let errors = $state({});
  let reactionOpen = $state({});
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
      home: existing?.home_fulltime_pred ?? 0,
      away: existing?.away_fulltime_pred ?? 0,
      outcomeType: existing?.outcome_type_pred ?? 'regulation',
      homePens: existing?.home_penalty_pred ?? '',
      awayPens: existing?.away_penalty_pred ?? '',
      hotTake: existing?.hot_take ?? ''
    };
  }

  function validateScore(value, label) {
    if (value === '' || value === null || value === undefined) {
      return `${label} can't be empty — enter a number from 0 to 99.`;
    }
    const n = Number(value);
    if (!Number.isFinite(n)) return `${label} must be a number.`;
    if (!Number.isInteger(n)) return `${label} must be a whole number (no decimals).`;
    if (n < 0) return `${label} can't be negative.`;
    if (n > 99) return `${label} can't be more than 99.`;
    return null;
  }

  let drafts = $state(
    Object.fromEntries(
      data.matches.filter((m) => m.is_knockout).map((m) => [m.id, getDraft(m.id)])
    )
  );

  let editing = $state(
    Object.fromEntries(
      data.matches.filter((m) => m.is_knockout).map((m) => [m.id, !predictionsByMatch[m.id]])
    )
  );

  function startEditing(match) {
    errors[match.id] = null;
    editing[match.id] = true;
  }

  function fail(matchId, message) {
    errors[matchId] = message;
    return false;
  }

  async function savePrediction(match) {
    if (isLocked(match)) return;
    const draft = drafts[match.id];
    errors[match.id] = null;

    const homeErr = validateScore(draft.home, `${match.home_team}'s score`);
    if (homeErr) return fail(match.id, homeErr);
    const awayErr = validateScore(draft.away, `${match.away_team}'s score`);
    if (awayErr) return fail(match.id, awayErr);

    const isDraw = Number(draft.home) === Number(draft.away);
    if (draft.outcomeType === 'penalties' && !isDraw) {
      return fail(match.id, 'A shootout only happens after a draw. Level the score (e.g. 1–1), or change how it was decided.');
    }
    if (draft.outcomeType !== 'penalties' && isDraw) {
      return fail(match.id, "A knockout match can't end level. Enter a winning score, or select \"Penalties\" if it went to a shootout.");
    }

    if (draft.outcomeType === 'penalties') {
      const homePensErr = validateScore(draft.homePens, `${match.home_team}'s shootout score`);
      if (homePensErr) return fail(match.id, homePensErr);
      const awayPensErr = validateScore(draft.awayPens, `${match.away_team}'s shootout score`);
      if (awayPensErr) return fail(match.id, awayPensErr);
      if (Number(draft.homePens) === Number(draft.awayPens)) {
        return fail(match.id, "Penalty shootouts can't end in a draw.Pick a winner.");
      }
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
      editing[match.id] = false;
    } else {
      errors[match.id] = 'Could not save prediction: ' + result.error.message;
    }
    savingId = null;
  }

  async function useConfidenceMultiplier(match) {
    errors[match.id] = null;
    const existing = predictionsByMatch[match.id];
    if (!existing) {
      errors[match.id] = 'Save a prediction for this match first.';
      return;
    }
    const { error } = await supabase.rpc('set_confidence_multiplier', {
      p_prediction_id: existing.id
    });
    if (error) {
      errors[match.id] = error.message.includes('already used')
        ? "You've already used your confidence multiplier today!"
        : error.message;
      return;
    }
    predictionsByMatch = {
      ...predictionsByMatch,
      [match.id]: { ...existing, confidence_multiplier: true, updated_at: new Date().toISOString() }
    };
    usedMultiplierToday = true;
  }

  async function setReaction(match, reaction) {
    reactionOpen[match.id] = false;
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

  function reactionFor(key) {
    return reactions.find((r) => r.key === key) ?? null;
  }

  function closeOnOutside(node, matchId) {
    function onPointerDown(e) {
      if (reactionOpen[matchId] && !node.contains(e.target)) {
        reactionOpen[matchId] = false;
      }
    }
    function onKeyDown(e) {
      if (e.key === 'Escape' && reactionOpen[matchId]) {
        reactionOpen[matchId] = false;
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return {
      destroy() {
        document.removeEventListener('pointerdown', onPointerDown, true);
        document.removeEventListener('keydown', onKeyDown);
      }
    };
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
    <div class="head-text">
      <h1>Knockout Predictions</h1>
      <p class="sub">Predict knockout matches before kickoff. Group results are on a separate page.</p>
    </div>
  </div>

  <div class="match-actions">
    <a class="pill-link" href="/matches/groups"><Icon name="chart" size={16} /> Group stage results</a>
    {#if hasFinished}
      <button
        class="pill-link"
        aria-pressed={!showFinished}
        onclick={() => (showFinished = !showFinished)}
      >
        <Icon name={showFinished ? 'eye-off' : 'eye'} size={16} />
        {showFinished ? 'Hide finished matches' : 'Show finished matches'}
      </button>
    {/if}
  </div>

  <HowItWorks />

  {#if data.matchesError}
    <p class="error">Couldn't load matches: {data.matchesError}</p>
  {/if}

  {#if knockoutMatches.length === 0}
    <p class="empty">No knockout matches yet — they appear here as the bracket fills in.</p>
  {/if}

  {#if knockoutMatches.length > 0 && visibleMatches.length === 0}
    <p class="empty">All matches are finished and hidden. <button class="inline-link" onclick={() => (showFinished = true)}>Show them again</button></p>
  {/if}

  {#each visibleMatches as match (match.id)}
    {@const locked = isLocked(match)}
    {@const finished = match.status === 'finished'}
    {@const existing = predictionsByMatch[match.id]}

    <div class="match-card" class:locked class:finished class:live={locked && !finished} class:upcoming={!locked}>
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
          {@const readonly = !editing[match.id]}
          <div class="predict-row">
            <input type="number" min="0" max="99" step="1" bind:value={draft.home} placeholder="0" disabled={readonly} />
            <span>–</span>
            <input type="number" min="0" max="99" step="1" bind:value={draft.away} placeholder="0" disabled={readonly} />
            <span class="reg-label">(90 min)</span>
          </div>

          <div class="outcome-row">
            <span class="outcome-label">Decided by:</span>
            {#each ['regulation', 'extra_time', 'penalties'] as ot}
              <button
                class="outcome-pill"
                class:selected={draft.outcomeType === ot}
                onclick={() => draft.outcomeType = ot}
                disabled={readonly}
              >
                {outcomeLabels[ot]}
              </button>
            {/each}
          </div>

          {#if draft.outcomeType === 'penalties'}
            <div class="predict-row pens-row">
              <span class="pens-label">Shootout:</span>
              <input type="number" min="0" max="99" step="1" bind:value={draft.homePens} placeholder="4" disabled={readonly} />
              <span>–</span>
              <input type="number" min="0" max="99" step="1" bind:value={draft.awayPens} placeholder="3" disabled={readonly} />
            </div>
          {/if}

          <input
            class="hot-take"
            type="text"
            bind:value={draft.hotTake}
            placeholder="What numbers can't express"
            maxlength="140"
            disabled={readonly}
          />

          <div class="action-row">
            {#if editing[match.id]}
              <button class="save-btn" onclick={() => savePrediction(match)} disabled={savingId === match.id}>
                {existing ? 'Update' : 'Predict'}
              </button>
            {:else}
              <button class="change-btn" onclick={() => startEditing(match)}>
                Change prediction
              </button>
              <span class="saved-tag"><Icon name="check" size={15} /> Saved</span>
            {/if}
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

          {#if errors[match.id]}
            <p class="form-error" role="alert">
              <Icon name="info" size={15} /> {errors[match.id]}
            </p>
          {/if}
        {/if}

        {#if existing && (locked || finished)}
          <p class="your-pick">
            Your pick: {existing.home_fulltime_pred}–{existing.away_fulltime_pred}
            ({outcomeLabels[existing.outcome_type_pred]}{existing.outcome_type_pred === 'penalties' ? `, ${existing.home_penalty_pred}-${existing.away_penalty_pred} pens` : ''})
            {#if existing.confidence_multiplier}<span class="mult-tag"><Icon name="flame" size={13} /> 2x</span>{/if}
          </p>
        {/if}

        {#if finished && existing}
          {@const current = reactionFor(existing.reaction)}
          <details class="reaction-dd" bind:open={reactionOpen[match.id]} use:closeOnOutside={match.id}>
            <summary>
              <span class="reaction-current">
                {#if current}{current.emoji} {current.label}{:else}Add a reaction…{/if}
              </span>
              <Icon name="chevron" size={16} class="reaction-caret" />
            </summary>
            <div class="reaction-menu">
              {#each reactions as r}
                <button
                  class="reaction-item"
                  class:selected={existing.reaction === r.key}
                  onclick={() => setReaction(match, r.key)}
                >
                  <span class="reaction-emoji">{r.emoji}</span> {r.label}
                </button>
              {/each}
            </div>
          </details>
        {/if}
      {/if}
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
  .match-actions {
    display: flex; align-items: center; justify-content: space-between;
    gap: 0.6rem; flex-wrap: wrap; margin: 0.75rem 0 1.25rem;
  }
  .pill-link {
    flex: none;
    display: inline-flex; align-items: center; gap: 0.4rem;
    text-decoration: none; color: var(--accent-bright); font-weight: 600;
    font-size: 0.9rem; font-family: inherit; border: 1px solid var(--surface-border);
    background: transparent; cursor: pointer;
    border-radius: 999px; padding: 0.4rem 0.9rem; transition: all 0.15s ease;
  }
  .pill-link:hover { border-color: var(--accent); box-shadow: var(--glow); }
  .pill-link:focus-visible { outline: 2px solid var(--accent-bright); outline-offset: 2px; }
  .sub { color: var(--muted); font-size: 0.9rem; margin: 0.25rem 0 0; }
  .empty { color: var(--muted); font-style: italic; }
  .inline-link {
    background: none; border: none; padding: 0; font: inherit; cursor: pointer;
    color: var(--accent-bright); text-decoration: underline;
  }
  @media (max-width: 540px) {
    .page-head { flex-direction: column; gap: 0.85rem; }
  }
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
  .match-card.locked:not(.finished) { opacity: 0.95; }
  .match-card.upcoming { background: rgba(74, 222, 128, 0.05); }
  .match-card.live {
    background: rgba(245, 197, 24, 0.1);
    border-color: rgba(245, 197, 24, 0.35);
  }
  .match-card.finished {
    background: rgba(248, 113, 113, 0.06);
    border-color: rgba(248, 113, 113, 0.3);
  }
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
  .predict-row input:disabled,
  .hot-take:disabled { opacity: 0.6; cursor: not-allowed; }
  .outcome-pill:disabled { cursor: not-allowed; }
  .outcome-pill:disabled:not(.selected) { opacity: 0.5; }
  .reg-label { font-size: 0.8rem; color: var(--muted); margin-left: 0.25rem; }
  .outcome-row { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.6rem; flex-wrap: wrap; }
  .outcome-label { font-size: 0.85rem; color: var(--muted); }
  .outcome-pill {
    padding: 0.3rem 0.7rem; border-radius: 999px; border: 1px solid var(--surface-border);
    background: transparent; color: inherit; cursor: pointer; font-size: 0.85rem;
    transition: all 0.15s ease;
  }
  .outcome-pill:hover:not(.selected):not(:disabled) {
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
  .change-btn {
    padding: 0.5rem 1rem; border-radius: var(--radius-sm);
    border: 1px solid var(--accent); background: transparent; color: var(--accent-bright);
    cursor: pointer; font-weight: 600;
    transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
  }
  .change-btn:hover { background: var(--accent); color: white; box-shadow: var(--glow-soft); }
  .saved-tag {
    display: inline-flex; align-items: center; gap: 0.3rem;
    font-size: 0.85rem; color: var(--accent-bright); font-weight: 600;
  }
  .saved-tag :global(.glow-icon) { color: var(--accent-bright); filter: none; }
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
  .form-error {
    display: flex; align-items: flex-start; gap: 0.4rem;
    margin-top: 0.6rem; padding: 0.5rem 0.7rem;
    font-size: 0.85rem; color: var(--error);
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.4);
    border-radius: var(--radius-sm);
  }
  .form-error :global(.glow-icon) {
    color: var(--error); filter: none; flex: none; margin-top: 0.1rem;
  }

  .reaction-dd { position: relative; margin-top: 0.75rem; }
  .reaction-dd summary {
    list-style: none; cursor: pointer;
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.4rem 0.8rem; border-radius: 999px;
    border: 1px solid var(--surface-border); background: transparent;
    color: inherit; font-size: 0.85rem; transition: all 0.15s ease;
  }
  .reaction-dd summary::-webkit-details-marker { display: none; }
  .reaction-dd summary:hover { border-color: var(--accent); box-shadow: var(--glow-soft); }
  .reaction-dd[open] summary { border-color: var(--accent-bright); box-shadow: var(--glow-soft); }
  .reaction-current { font-weight: 600; }
  .reaction-dd :global(.reaction-caret) { transition: transform 0.15s ease; }
  .reaction-dd[open] :global(.reaction-caret) { transform: rotate(180deg); }

  .reaction-menu {
    position: absolute; z-index: 30;
    left: 0; top: calc(100% + 0.35rem);
    min-width: 14rem; max-width: min(22rem, calc(100vw - 2.5rem));
    max-height: 15rem; overflow-y: auto;
    display: flex; flex-direction: column; gap: 0.15rem;
    padding: 0.35rem; border-radius: var(--radius-sm);
    border: 1px solid var(--surface-border); background: var(--bg-elev);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.45);
  }
  .reaction-item {
    display: flex; align-items: center; gap: 0.5rem;
    width: 100%; text-align: left;
    padding: 0.45rem 0.6rem; border-radius: var(--radius-sm);
    border: 1px solid transparent; background: transparent;
    color: inherit; cursor: pointer; font-size: 0.85rem;
    transition: background 0.12s ease, border-color 0.12s ease;
  }
  .reaction-item:hover:not(.selected) { background: var(--surface); border-color: var(--accent); }
  .reaction-item.selected { background: var(--accent); border-color: var(--accent-bright); color: white; }
  .reaction-emoji { flex: none; }
  .error { color: var(--error); }
</style>
