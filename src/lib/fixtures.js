const FINISHED_STATUSES = new Set(['FINISHED', 'AWARDED']);
const NOT_STARTED_STATUSES = new Set(['SCHEDULED', 'TIMED', 'POSTPONED', 'SUSPENDED', 'CANCELLED']);
const MAX_GOALS = 30;

const KNOCKOUT_STAGES = new Set([
  'LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL'
]);

const STAGE_KEYS = {
  GROUP_STAGE: 'group',
  LAST_32: 'round_of_32',
  LAST_16: 'round_of_16',
  QUARTER_FINALS: 'quarter',
  SEMI_FINALS: 'semi',
  THIRD_PLACE: 'third_place',
  FINAL: 'final'
};

export function mapStatus(status) {
  if (FINISHED_STATUSES.has(status)) return 'finished';
  if (NOT_STARTED_STATUSES.has(status)) return 'scheduled';
  return 'live'; // IN_PLAY, PAUSED
}

export function outcomeTypeFromDuration(duration) {
  if (duration === 'PENALTY_SHOOTOUT') return 'penalties';
  if (duration === 'EXTRA_TIME') return 'extra_time';
  if (duration === 'REGULAR') return 'regulation';
  return null;
}

export function isKnockoutStage(stage) {
  return typeof stage === 'string' && KNOCKOUT_STAGES.has(stage);
}

export function stageKey(stage) {
  return STAGE_KEYS[stage] ?? null;
}

function safeGoals(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > MAX_GOALS) return null;
  return n;
}

const COUNTRY_ISO = {
  Uruguay: 'UY', Germany: 'DE', Spain: 'ES', Paraguay: 'PY', Argentina: 'AR',
  Ghana: 'GH', Brazil: 'BR', Portugal: 'PT', Japan: 'JP', Mexico: 'MX',
  'United States': 'US', 'South Korea': 'KR', France: 'FR', 'South Africa': 'ZA',
  Algeria: 'DZ', Australia: 'AU', 'New Zealand': 'NZ', Switzerland: 'CH',
  Ecuador: 'EC', Sweden: 'SE', Czechia: 'CZ', Croatia: 'HR', 'Saudi Arabia': 'SA',
  Tunisia: 'TN', Turkey: 'TR', Senegal: 'SN', Belgium: 'BE', Morocco: 'MA',
  Austria: 'AT', Colombia: 'CO', Egypt: 'EG', Canada: 'CA', Haiti: 'HT',
  Iran: 'IR', 'Bosnia-Herzegovina': 'BA', Panama: 'PA', 'Cape Verde Islands': 'CV',
  'Congo DR': 'CD', 'Ivory Coast': 'CI', Qatar: 'QA', Jordan: 'JO', Iraq: 'IQ',
  Uzbekistan: 'UZ', Netherlands: 'NL', Norway: 'NO', 'Curacao': 'CW'
};

const SPECIAL_FLAGS = { England: 'gb-eng', Scotland: 'gb-sct' };

export function flagForCountry(name) {
  if (typeof name !== 'string') return null;
  if (SPECIAL_FLAGS[name]) return SPECIAL_FLAGS[name];
  const iso = COUNTRY_ISO[name];
  return iso ? iso.toLowerCase() : null;
}

function decidingScore(score) {
  if (score?.duration === 'PENALTY_SHOOTOUT') {
    const rt = score.regularTime;
    const et = score.extraTime;
    if (rt) {
      return {
        home: sumGoals(rt.home, et?.home),
        away: sumGoals(rt.away, et?.away)
      };
    }
    const pen = score.penalties ?? {};
    return {
      home: diffGoals(score.fullTime?.home, pen.home),
      away: diffGoals(score.fullTime?.away, pen.away)
    };
  }
  return {
    home: safeGoals(score?.fullTime?.home),
    away: safeGoals(score?.fullTime?.away)
  };
}

function sumGoals(a, b) {
  const x = safeGoals(a);
  if (x === null) return null;
  const y = b === null || b === undefined ? 0 : safeGoals(b);
  if (y === null) return null;
  return Math.min(x + y, MAX_GOALS);
}

function diffGoals(total, part) {
  const t = safeGoals(total);
  const p = safeGoals(part);
  if (t === null || p === null) return null;
  const d = t - p;
  return d >= 0 ? d : null;
}

export function mapMatchToRow(match, flagFor = flagForCountry) {
  if (!match || typeof match !== 'object') return null;

  const id = match.id;
  const kickoff = match.utcDate;

  if (id === null || id === undefined) return null;
  if (typeof kickoff !== 'string' || Number.isNaN(Date.parse(kickoff))) return null;

  const homeName = typeof match.homeTeam?.name === 'string' && match.homeTeam.name.trim()
    ? match.homeTeam.name.trim() : 'TBD';
  const awayName = typeof match.awayTeam?.name === 'string' && match.awayTeam.name.trim()
    ? match.awayTeam.name.trim() : 'TBD';

  const status = mapStatus(match.status);
  const finished = status === 'finished';
  const decided = finished ? decidingScore(match.score) : { home: null, away: null };
  const isPens = finished && match.score?.duration === 'PENALTY_SHOOTOUT';

  return {
    external_id: String(id),
    home_team: homeName,
    away_team: awayName,
    home_team_flag: flagFor(homeName) ?? null,
    away_team_flag: flagFor(awayName) ?? null,
    kickoff_time: new Date(kickoff).toISOString(),
    stage: stageKey(match.stage),
    is_knockout: isKnockoutStage(match.stage),
    status,
    home_fulltime: decided.home,
    away_fulltime: decided.away,
    outcome_type: finished ? outcomeTypeFromDuration(match.score?.duration) : null,
    home_penalty: isPens ? safeGoals(match.score?.penalties?.home) : null,
    away_penalty: isPens ? safeGoals(match.score?.penalties?.away) : null
  };
}
