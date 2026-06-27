<script>
  import Icon from '$lib/Icon.svelte';
  import HowItWorks from '$lib/HowItWorks.svelte';

  const pages = [
    { icon: 'ball', title: 'Matches (Knockout Predictions)', text: 'Predict the score of each upcoming knockout match before it kicks off. Choose how it’s decided (90 min, extra time, or penalties), add a hot take, and spend your once-a-day Confidence 2× on the match you feel surest about. Predictions lock automatically at kickoff. After a match finishes, you can react to the result (VAR robbed me, Called it, Devastated…) right on its card — your reactions feed the Reaction Leaderboard in Fun Stats. A link at the top opens the Group Stage Results (past group games, for reference only — they aren’t predicted).' },
    { icon: 'trophy', title: 'Scoreboard', text: 'The league standings — total points per player. Ties are broken by whoever’s predicted scores were closest to the real results. The leader gets a gold marker.' },
    { icon: 'chart', title: 'Fun Stats', text: 'Playful awards from everyone’s predictions: biggest upset callers, shootout psychics, the most delusional scorelines, and a reaction leaderboard.' },
    { icon: 'user', title: 'Profile', text: 'Pick your display name and a cartoon animal avatar — this is how you show up on the scoreboard and stats.' }
  ];
</script>

<div class="wrap">
  <h1 class="page-title"><Icon name="info" size={24} /> About this app</h1>

  <p class="lead">
    World Cup Mini League is a private prediction game developed by some nerd you may be familiar with.
    Call the knockout-stage matches of the 2026 World Cup, earn points for how close you get, and
    climb the leaderboard over the tournament. It’s just for bragging rights — no money,
    no stakes, only eternal glory (or until everyone forgets about it two days after the World Cup ends).
  </p>

  <section>
    <h2>What’s on each page</h2>
    {#each pages as p}
      <div class="page-row">
        <span class="page-icon"><Icon name={p.icon} size={22} /></span>
        <div>
          <strong>{p.title}</strong>
          <p>{p.text}</p>
        </div>
      </div>
    {/each}
  </section>

  <section>
    <h2>Scoring</h2>
    <p class="muted-note">Here’s exactly how points are awarded:</p>
    <HowItWorks />
  </section>

  <section>
    <h2><Icon name="refresh" size={20} /> Where the results come from</h2>
    <p>
      Match fixtures, scores and final results come from a free public football data API
      (<a href="https://www.football-data.org" target="_blank" rel="noreferrer">football-data.org</a>).
      During the tournament the app checks for updates automatically about every
      <strong>15 minutes</strong> — so when a knockout match ends, its result appears and
      everyone’s predictions are scored within a few minutes, with nothing to refresh and no
      scores typed in by hand. It’s not a second-by-second live ticker — think “updated shortly
      after the final whistle,” not instant.
    </p>
  </section>

  <section class="login-note">
    <h2><Icon name="lock" size={20} /> Logging in &amp; staying logged in</h2>
    <p>
      You sign in with a <strong>magic link</strong> sent to your email — no password to
      remember. Once you’re in, you <strong>stay logged in</strong>: closing the tab or your
      browser won’t sign you out, and the app keeps your session alive for you.
    </p>
    <p class="warn">
      <strong>Heads up:</strong> if you click <em>Log out</em>, getting back in means requesting
      a brand-new magic link by email each time. So during the World Cup, we recommend you
      <strong>don’t log out</strong> — just close the tab and come back whenever; you’ll
      still be signed in.
    </p>
  </section>
</div>

<style>
  .wrap { max-width: 640px; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
  .page-title { display: inline-flex; align-items: center; gap: 0.5rem; }
  .lead { font-size: 1.02rem; }
  section { margin-top: 2rem; }
  h2 { display: inline-flex; align-items: center; gap: 0.5rem; }
  .page-row {
    display: flex; gap: 0.8rem; align-items: flex-start;
    padding: 0.9rem 0; border-bottom: 1px solid var(--surface-border);
  }
  .page-icon { flex: none; margin-top: 0.15rem; }
  .page-row strong { color: var(--accent-bright); }
  .page-row p { margin: 0.3rem 0 0; color: var(--text); font-size: 0.92rem; }
  .muted-note { color: var(--muted); font-size: 0.9rem; }
  .login-note {
    background: var(--surface);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius);
    padding: 1rem 1.25rem;
  }
  .warn { color: var(--locked); }
  .warn strong, .warn em { color: var(--locked); }
</style>
