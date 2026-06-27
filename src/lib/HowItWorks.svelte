<script>
  import Icon from '$lib/Icon.svelte';
</script>

<details class="how">
  <summary>
    <Icon name="target" size={16} /> How it works &amp; scoring
  </summary>

  <div class="body">
    <p>
      Predict the <strong>fulltime score</strong> of each knockout match before it kicks off.
      Edit it as often as you like until kickoff — it <strong>locks automatically</strong> when
      the match starts. Pick how the match is decided (90&nbsp;min / extra time / penalties);
      if you call penalties, add a shootout score too. Group-stage games aren't predicted.
    </p>

    <table>
      <thead><tr><th>Points</th><th>For</th></tr></thead>
      <tbody>
        <tr><td>7</td><td>Exact fulltime score <em>and</em> exact penalty shootout score (penalty matches only)</td></tr>
        <tr><td>5</td><td>Exact fulltime score</td></tr>
        <tr><td>3</td><td>Right outcome type (90&nbsp;min / ET / pens) and right goal difference</td></tr>
        <tr><td>2</td><td>Right outcome type and right winner</td></tr>
        <tr><td>1</td><td>Got one team's exact goals</td></tr>
        <tr><td>0.5</td><td>Wrong otherwise, but correctly called it'd go to penalties</td></tr>
        <tr><td>0</td><td>None of the above</td></tr>
      </tbody>
    </table>

    <p class="note">
      <span class="flame"><Icon name="flame" size={14} /></span>
      <strong>Confidence 2×:</strong> once per day you can double the points from a single
      prediction — use it on your most confident match. It doubles whatever tier you land in
      (even 0.5 or 0).
    </p>

    <p class="note">
      <strong>Standings:</strong> most points wins. Ties are broken by the smallest total
      score difference — i.e. whoever's predicted scores were closest to the real results.
    </p>
  </div>
</details>

<style>
  .how {
    background: var(--surface);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius);
    padding: 0.4rem 0.9rem;
    margin: 0.75rem 0 1.25rem;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .how:hover { border-color: var(--accent); box-shadow: var(--glow-soft); }
  summary {
    cursor: pointer;
    font-weight: 700;
    color: var(--accent-bright);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0;
    list-style: none;
    transition: text-shadow 0.15s ease;
  }
  .how:hover summary { text-shadow: var(--glow-text); }
  summary::-webkit-details-marker { display: none; }
  summary::after {
    content: '+';
    margin-left: auto;
    color: var(--muted);
    font-weight: 400;
  }
  .how[open] summary::after { content: '–'; }
  .body { font-size: 0.9rem; padding-bottom: 0.5rem; }
  .body p { margin: 0.5rem 0; }
  table { width: 100%; border-collapse: collapse; margin: 0.75rem 0; }
  th, td { text-align: left; padding: 0.35rem 0.5rem; border-bottom: 1px solid var(--surface-border); vertical-align: top; }
  th { color: var(--muted); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.03em; }
  td:first-child, th:first-child { width: 3rem; font-weight: 700; color: var(--accent-bright); }
  .note { color: var(--muted); }
  .note strong { color: var(--text); }
  .flame { color: var(--accent); }
</style>
