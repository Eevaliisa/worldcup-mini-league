-- ============================================================
-- World Cup Mini League — Supabase schema
-- Run this in the Supabase SQL editor, top to bottom.
-- ============================================================

-- ---------- 1. PROFILES ----------
-- One row per auth user. Created automatically on first login
-- via a trigger on auth.users.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar text default 'fox',              -- avatar key, rendered as a cartoon animal (see src/lib/Avatar.svelte)
  created_at timestamptz default now()
);

-- Auto-create a profile row whenever someone signs up via magic link
create function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ---------- 2. LEAGUES ----------
create table leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,      -- not used for login, but handy for "is this person allowed"
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ---------- 3. LEAGUE MEMBERS ----------
create table league_members (
  league_id uuid references leagues(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (league_id, user_id)
);

-- ---------- 4. MATCHES ----------
-- This app only runs for the knockout stage (round of 32 onward) — group
-- stage matches are stored too (so the full schedule can be displayed) but
-- carry is_knockout = false and never get predictions or scoring.
--
-- Score field naming deliberately mirrors API-Football's own response
-- shape (score.fulltime, score.penalty) rather than inventing our own
-- "regulation time" concept. This matters because API-Football's
-- `fulltime` score IS the deciding score whether or not extra time was
-- played — when ET happens, `fulltime` reflects the after-120-minutes
-- score, not the 90-minute score. We just store and compare against
-- whatever the API calls "fulltime", same as the API does, rather than
-- inventing a 90-minute field that the free API doesn't reliably give us
-- for matches that did go to extra time.
create table matches (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,               -- the API-Football fixture id, for syncing
  home_team text not null,
  away_team text not null,
  home_team_flag text,                   -- emoji or flag code, e.g. 'br'
  away_team_flag text,
  kickoff_time timestamptz not null,
  stage text,                            -- 'group', 'round_of_32', 'quarter', 'semi', 'final', etc.
  is_knockout boolean not null default false, -- group matches are listed but not predictable
  status text not null default 'scheduled', -- scheduled | live | finished
  -- Mirrors API-Football's score.fulltime — the score that decided the
  -- match, whether that took 90 or 120 minutes.
  home_fulltime int,
  away_fulltime int,
  -- How the match was actually decided. Group matches stay null.
  outcome_type text,                     -- 'regulation' | 'extra_time' | 'penalties'
  -- Mirrors API-Football's score.penalty — only populated if outcome_type = 'penalties'
  home_penalty int,
  away_penalty int,
  created_at timestamptz default now()
);

create index idx_matches_kickoff on matches (kickoff_time);
create index idx_matches_status on matches (status);

-- ---------- 5. PREDICTIONS ----------
-- Only ever created for knockout matches (is_knockout = true). The app
-- layer enforces this by simply not rendering a prediction form for group
-- matches, and the insert policy below double-checks it server-side too.
--
-- Field naming mirrors matches table / API-Football's own response shape
-- (fulltime, penalty) — see comment on the matches table above.
create table predictions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  home_fulltime_pred int not null,        -- predicted fulltime score (90 or 120 min, same as the API's own field)
  away_fulltime_pred int not null,
  outcome_type_pred text not null check (outcome_type_pred in ('regulation', 'extra_time', 'penalties')),
  -- Only meaningful (and only required) when outcome_type_pred = 'penalties'
  home_penalty_pred int,
  away_penalty_pred int,
  hot_take text,                          -- "hot take prediction" free text field
  confidence_multiplier boolean default false, -- once-per-day power-up
  reaction text,                          -- 'var_robbed', 'called_it', 'devastated', etc — set after result
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (match_id, user_id),             -- one prediction per person per match
  -- If you predict penalties, you must give a penalty score, and the
  -- penalty score must have a winner (no draws in a shootout).
  check (
    outcome_type_pred != 'penalties'
    or (home_penalty_pred is not null
        and away_penalty_pred is not null
        and home_penalty_pred != away_penalty_pred)
  )
);

create index idx_predictions_match on predictions (match_id);
create index idx_predictions_user on predictions (user_id);

-- ---------- 6. SCORES (computed points per prediction) ----------
create table scores (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid references predictions(id) on delete cascade unique,
  match_id uuid references matches(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  points numeric(4,1) not null,             -- numeric, not int — the "called penalties correctly" bonus is 0.5
  breakdown text,                          -- e.g. 'exact_score_and_pens', 'exact_score', 'outcome_and_diff', 'outcome_and_winner', 'one_team_bonus', 'called_penalties', 'wrong'
  score_diff int not null default 0,       -- |home_pred - home_actual| + |away_pred - away_actual|, for tiebreaking
  computed_at timestamptz default now()
);

create index idx_scores_user on scores (user_id);
create index idx_scores_match on scores (match_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table leagues enable row level security;
alter table league_members enable row level security;
alter table matches enable row level security;
alter table predictions enable row level security;
alter table scores enable row level security;

-- Helper: is the current user a member of a given league?
create function is_league_member(target_league_id uuid)
returns boolean as $$
  select exists (
    select 1 from league_members
    where league_id = target_league_id and user_id = auth.uid()
  );
$$ language sql security definer stable;

-- PROFILES: anyone in the same league can see each other's display name/avatar
-- (needed for scoreboard + fun stats). Users can only edit their own row.
create policy "profiles_select_league_members"
  on profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from league_members lm1
      join league_members lm2 on lm1.league_id = lm2.league_id
      where lm1.user_id = auth.uid() and lm2.user_id = profiles.id
    )
  );

create policy "profiles_update_own"
  on profiles for update
  using (id = auth.uid());

-- LEAGUES: only members can see their league
create policy "leagues_select_member"
  on leagues for select
  using (is_league_member(id));

-- LEAGUE_MEMBERS: only visible to other members of the same league
create policy "league_members_select_same_league"
  on league_members for select
  using (is_league_member(league_id));

-- A user can insert themself into a league (this is how "joining" works —
-- the invite code check happens in the app layer before this insert is called)
create policy "league_members_insert_self"
  on league_members for insert
  with check (user_id = auth.uid());

-- MATCHES: visible to anyone who is a member of at least one league
-- (matches are shared/global, not per-league, since it's one shared World Cup)
create policy "matches_select_any_member"
  on matches for select
  using (exists (select 1 from league_members where user_id = auth.uid()));

-- Only service role (server-side cron / admin) writes matches — no client policy for insert/update.
-- This means INSERT/UPDATE/DELETE simply have no policy = blocked for normal users automatically.

-- PREDICTIONS: a user can see all predictions for a match ONLY once that
-- match has kicked off (this is what makes the "fun stats" + "see what
-- everyone predicted" feature work without letting people copy picks pre-lock).
create policy "predictions_select_after_kickoff"
  on predictions for select
  using (
    exists (
      select 1 from league_members where user_id = auth.uid()
    )
    and (
      user_id = auth.uid()  -- always see your own
      or exists (
        select 1 from matches
        where matches.id = predictions.match_id
        and matches.kickoff_time <= now()
      )
    )
  );

-- Insert: only your own prediction, only before kickoff, only for knockout
-- matches, AND only if you're actually a member of a league. Without this
-- last check, anyone who requests a magic link (which Supabase will send to
-- any email, allowed or not) could still write predictions even though they
-- can't see the scoreboard or other people's picks.
create policy "predictions_insert_own_before_kickoff"
  on predictions for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from league_members where user_id = auth.uid())
    and exists (
      select 1 from matches
      where matches.id = match_id
      and matches.kickoff_time > now()
      and matches.is_knockout = true
    )
  );

-- Update: only your own prediction, only before kickoff, only if you're a
-- league member (covers edits + the post-match "reaction" button — see
-- note below, reactions need a separate policy)
create policy "predictions_update_own_before_kickoff"
  on predictions for update
  using (
    user_id = auth.uid()
    and exists (select 1 from league_members where user_id = auth.uid())
    and exists (
      select 1 from matches
      where matches.id = match_id
      and matches.kickoff_time > now()
    )
  );

-- Separate policy: allow updating ONLY the reaction field after the match finishes.
-- (Postgres RLS can't restrict to specific columns directly, so we enforce
-- "score fields unchanged" via a check — simplest robust approach is a
-- dedicated Postgres function called via RPC instead of a raw table update.
-- See set_reaction() function below.)

-- SCORES: read-only for everyone in the league, never written by clients
create policy "scores_select_any_member"
  on scores for select
  using (exists (select 1 from league_members where user_id = auth.uid()));

-- ============================================================
-- RPC FUNCTIONS (called from the app instead of raw table writes)
-- ============================================================

-- Let a user set their post-match reaction without touching score fields,
-- and only after the match has finished.
create function set_reaction(p_prediction_id uuid, p_reaction text)
returns void as $$
begin
  update predictions
  set reaction = p_reaction
  where id = p_prediction_id
    and user_id = auth.uid()
    and exists (
      select 1 from matches
      where matches.id = predictions.match_id
      and matches.status = 'finished'
    );
end;
$$ language plpgsql security definer;

-- Join a league using its invite code. This is the actual access gate now
-- instead of someone manually pre-adding emails: anyone who has the code
-- (shared once, e.g. in your group chat) can call this once logged in.
-- Safe because: it can only ever insert auth.uid() as the member (never an
-- arbitrary user_id), and it looks the league up by code server-side rather
-- than trusting a league_id passed from the client.
-- NOTE: the returned columns are deliberately NOT named league_id/league_name.
-- A RETURNS TABLE column name becomes an in-scope variable, and a bare
-- `league_id` would then be ambiguous against league_members.league_id in the
-- INSERT ... ON CONFLICT below ("column reference league_id is ambiguous").
create function join_league_with_code(p_invite_code text)
returns table (joined_league_id uuid, joined_league_name text) as $$
declare
  v_league_id uuid;
  v_league_name text;
begin
  select id, name into v_league_id, v_league_name
  from leagues
  where invite_code = p_invite_code;

  if v_league_id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into league_members (league_id, user_id)
  values (v_league_id, auth.uid())
  on conflict (league_id, user_id) do nothing;

  return query select v_league_id, v_league_name;
end;
$$ language plpgsql security definer;

-- Confidence multiplier: once per real-world day, a user can mark ONE
-- not-yet-locked prediction as "confidence x2". Enforced server-side here,
-- not just in the UI, so people can't double-dip by hitting the API directly.
create function set_confidence_multiplier(p_prediction_id uuid)
returns void as $$
declare
  already_used_today boolean;
begin
  select exists (
    select 1 from predictions
    where user_id = auth.uid()
      and confidence_multiplier = true
      and updated_at::date = now()::date
  ) into already_used_today;

  if already_used_today then
    raise exception 'Confidence multiplier already used today';
  end if;

  update predictions
  set confidence_multiplier = true, updated_at = now()
  where id = p_prediction_id
    and user_id = auth.uid()
    and exists (
      select 1 from matches
      where matches.id = predictions.match_id
      and matches.kickoff_time > now()
    );
end;
$$ language plpgsql security definer;

-- ============================================================
-- SCORING ENGINE
-- Called by the server-side sync job after a match is marked 'finished'.
-- Single source of truth for the scoring rules — see comment block for the
-- exact bucket logic (each prediction falls into exactly ONE bucket).
--
-- All score comparisons here use "fulltime" in the same sense API-Football
-- uses it: the score that decided the match, whether after 90 or 120
-- minutes. We don't track a separate 90-minute score — see the comment on
-- the matches table for why.
--
-- Knockout scoring tiers:
--   7 pts   — exact fulltime score AND (if it went to penalties) exact
--             penalty score too. Pens-not-applicable matches cap at 5 here,
--             since there's no penalty score to get right.
--   5 pts   — exact fulltime score, but either no pens were needed or the
--             predicted penalty score (if given) wasn't exact.
--   3 pts   — correct outcome_type (regulation/extra_time/penalties) AND
--             correct goal difference on the fulltime score.
--   2 pts   — correct outcome_type AND correct winner.
--   1 pt    — wrong winner/outcome_type, but got one team's fulltime
--             goals exactly right.
--   0.5 pts — wrong winner AND wrong on both teams' goals, but correctly
--             called that the match would go to penalties. Calling
--             penalties right is a genuinely hard, specific guess even
--             when the rest of the prediction misses, so it gets a small
--             consolation bonus instead of a flat zero.
--   0 pts   — none of the above.
-- "Correct winner" here means: who actually advanced (home or away) — every
-- knockout match has a winner, there's no draw tier.
-- ============================================================

create function calculate_match_scores(p_match_id uuid)
returns void as $$
declare
  m matches%rowtype;
  pred predictions%rowtype;
  pts numeric(4,1);
  bucket text;
  actual_winner text;   -- 'home' or 'away' — who advanced
  pred_winner text;
  actual_diff int;
  pred_diff int;
  outcome_correct boolean;
  pens_exact boolean;
  mult int;
begin
  select * into m from matches where id = p_match_id;

  if not m.is_knockout then
    raise exception 'Match % is not a knockout match — scoring not applicable', p_match_id;
  end if;

  if m.home_fulltime is null or m.away_fulltime is null or m.outcome_type is null then
    raise exception 'Match % has no final result yet', p_match_id;
  end if;

  -- Who actually advanced: fulltime score decides unless it was a draw
  -- (only possible when outcome_type = 'penalties'), in which case the
  -- penalty shootout decides.
  if m.home_fulltime != m.away_fulltime then
    actual_winner := case when m.home_fulltime > m.away_fulltime then 'home' else 'away' end;
  else
    actual_winner := case when m.home_penalty > m.away_penalty then 'home' else 'away' end;
  end if;

  actual_diff := m.home_fulltime - m.away_fulltime;

  for pred in select * from predictions where match_id = p_match_id loop

    -- Predicted winner: if they predicted penalties, the penalty score
    -- decides the winner even if their fulltime prediction was a draw.
    if pred.outcome_type_pred = 'penalties' then
      pred_winner := case when pred.home_penalty_pred > pred.away_penalty_pred then 'home' else 'away' end;
    else
      pred_winner := case when pred.home_fulltime_pred > pred.away_fulltime_pred then 'home' else 'away' end;
    end if;

    pred_diff := pred.home_fulltime_pred - pred.away_fulltime_pred;

    outcome_correct := (pred.outcome_type_pred = m.outcome_type);

    pens_exact := (
      m.outcome_type = 'penalties'
      and pred.outcome_type_pred = 'penalties'
      and pred.home_penalty_pred = m.home_penalty
      and pred.away_penalty_pred = m.away_penalty
    );

    -- Bucketed, mutually exclusive scoring:
    if pred.home_fulltime_pred = m.home_fulltime and pred.away_fulltime_pred = m.away_fulltime
       and (m.outcome_type != 'penalties' or pens_exact) then
      pts := case when m.outcome_type = 'penalties' then 7 else 5 end;
      bucket := case when m.outcome_type = 'penalties' then 'exact_score_and_pens' else 'exact_score' end;
    elsif pred.home_fulltime_pred = m.home_fulltime and pred.away_fulltime_pred = m.away_fulltime then
      -- exact fulltime score but wrong/missing penalty prediction
      pts := 5; bucket := 'exact_score';
    elsif outcome_correct and pred_diff = actual_diff then
      pts := 3; bucket := 'outcome_and_diff';
    elsif outcome_correct and pred_winner = actual_winner then
      pts := 2; bucket := 'outcome_and_winner';
    elsif pred.home_fulltime_pred = m.home_fulltime or pred.away_fulltime_pred = m.away_fulltime then
      pts := 1; bucket := 'one_team_bonus';
    elsif m.outcome_type = 'penalties' and pred.outcome_type_pred = 'penalties' then
      -- Wrong on score and wrong on winner, but they did correctly call
      -- that it would go to penalties — a small reward for that read.
      pts := 0.5; bucket := 'called_penalties';
    else
      pts := 0; bucket := 'wrong';
    end if;

    -- Confidence multiplier doubles whatever was earned (including 0)
    mult := case when pred.confidence_multiplier then 2 else 1 end;
    pts := pts * mult;

    insert into scores (prediction_id, match_id, user_id, points, breakdown, score_diff)
    values (
      pred.id, p_match_id, pred.user_id, pts, bucket,
      abs(pred.home_fulltime_pred - m.home_fulltime) + abs(pred.away_fulltime_pred - m.away_fulltime)
    )
    on conflict (prediction_id) do update
      set points = excluded.points, breakdown = excluded.breakdown,
          score_diff = excluded.score_diff, computed_at = now();

  end loop;
end;
$$ language plpgsql security definer;

-- ============================================================
-- VIEWS — scoreboard + fun stats
--
-- All views below use `security_invoker = true` (Postgres 15+). Without
-- this, a view runs with the permissions of whoever created it, not the
-- person querying it — which means it would silently bypass the RLS
-- policies on the underlying tables. With security_invoker, anyone who
-- isn't a league member gets nothing back from these views, same as if
-- they'd queried the underlying tables directly.
-- ============================================================

-- Main scoreboard: total points per user, tiebreak by smallest cumulative
-- score difference across all their predictions (closer to reality wins ties)
--
-- Scoped to league_members rather than all of `profiles` — anyone who
-- requested a magic link but never joined a league (or joined a different
-- one, once multi-league support exists) shouldn't clutter the board.
create view scoreboard with (security_invoker = true) as
select
  p.id as user_id,
  p.display_name,
  p.avatar,
  coalesce(sum(s.points), 0) as total_points,
  coalesce(sum(s.score_diff), 0) as total_score_diff,
  count(s.id) as matches_scored
from profiles p
join league_members lm on lm.user_id = p.id
left join scores s on s.user_id = p.id
group by p.id, p.display_name, p.avatar
order by total_points desc, total_score_diff asc;

-- Fun stat: "Biggest upset predictor" — predicted the correct outcome when
-- the goal difference shows it was a big underdog win (diff >= 2) that few
-- others predicted correctly.
create view fun_stat_biggest_upset with (security_invoker = true) as
select
  pr.user_id,
  pf.display_name,
  m.home_team, m.away_team, m.home_fulltime, m.away_fulltime,
  pr.home_fulltime_pred, pr.away_fulltime_pred,
  abs(m.home_fulltime - m.away_fulltime) as actual_margin
from predictions pr
join matches m on m.id = pr.match_id
join profiles pf on pf.id = pr.user_id
join scores sc on sc.prediction_id = pr.id
where sc.breakdown in ('exact_score_and_pens', 'exact_score', 'outcome_and_diff', 'outcome_and_winner')
  and abs(m.home_fulltime - m.away_fulltime) >= 2
  and m.status = 'finished'
order by actual_margin desc, m.kickoff_time desc;

-- Fun stat: "Most delusional prediction" — biggest gap between predicted
-- and actual total goals, regardless of whether result was right.
create view fun_stat_most_delusional with (security_invoker = true) as
select
  pr.user_id,
  pf.display_name,
  m.home_team, m.away_team, m.home_fulltime, m.away_fulltime,
  pr.home_fulltime_pred, pr.away_fulltime_pred,
  abs((pr.home_fulltime_pred + pr.away_fulltime_pred) - (m.home_fulltime + m.away_fulltime))
    + abs(pr.home_fulltime_pred - m.home_fulltime) + abs(pr.away_fulltime_pred - m.away_fulltime)
    as delusion_score
from predictions pr
join matches m on m.id = pr.match_id
join profiles pf on pf.id = pr.user_id
where m.status = 'finished'
order by delusion_score desc;

-- Fun stat: who uses each reaction the most (generalized across all reaction types now)
create view fun_stat_reaction_counts with (security_invoker = true) as
select
  pf.id as user_id,
  pf.display_name,
  pr.reaction,
  count(*) as reaction_count
from predictions pr
join profiles pf on pf.id = pr.user_id
where pr.reaction is not null
group by pf.id, pf.display_name, pr.reaction
order by reaction_count desc;

-- Fun stat: "Shootout Psychic" — correctly predicted a match would go to
-- penalties AND got the exact shootout score right. Rare, deserves a callout.
create view fun_stat_shootout_psychic with (security_invoker = true) as
select
  pr.user_id,
  pf.display_name,
  m.home_team, m.away_team,
  m.home_penalty, m.away_penalty,
  pr.home_penalty_pred, pr.away_penalty_pred
from predictions pr
join matches m on m.id = pr.match_id
join profiles pf on pf.id = pr.user_id
join scores sc on sc.prediction_id = pr.id
where sc.breakdown = 'exact_score_and_pens'
order by m.kickoff_time desc;

-- Fun stat: "Lazy Sloth" — registered members who skip predicting. For each
-- league member it counts how many already-locked (kicked-off) knockout matches
-- they predicted vs how many were available, and lists anyone who missed at
-- least one, laziest (fewest predictions) first. LEFT JOIN so members who
-- predicted nothing still show up. The category is always shown in the app, but
-- it withholds names until a few knockout matches have locked (app-side gate).
create view fun_stat_lazy_sloth with (security_invoker = true) as
select
  pf.id as user_id,
  pf.display_name,
  (select count(*) from matches m where m.is_knockout = true and m.kickoff_time <= now()) as lockable_matches,
  count(pr.id) as predicted
from profiles pf
join league_members lm on lm.user_id = pf.id
left join predictions pr
  on pr.user_id = pf.id
  and pr.match_id in (select id from matches where is_knockout = true and kickoff_time <= now())
group by pf.id, pf.display_name
having count(pr.id) < (select count(*) from matches m where m.is_knockout = true and m.kickoff_time <= now())
order by predicted asc, pf.display_name asc;
