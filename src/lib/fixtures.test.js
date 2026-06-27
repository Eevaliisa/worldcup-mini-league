import { describe, it, expect } from 'vitest';
import {
  mapStatus,
  outcomeTypeFromDuration,
  isKnockoutStage,
  stageKey,
  flagForCountry,
  mapMatchToRow
} from './fixtures.js';

describe('mapStatus', () => {
  it('treats FINISHED/AWARDED as finished', () => {
    expect(mapStatus('FINISHED')).toBe('finished');
    expect(mapStatus('AWARDED')).toBe('finished');
  });
  it('treats scheduled-ish codes as scheduled', () => {
    for (const s of ['SCHEDULED', 'TIMED', 'POSTPONED']) expect(mapStatus(s)).toBe('scheduled');
  });
  it('treats in-play codes as live', () => {
    expect(mapStatus('IN_PLAY')).toBe('live');
    expect(mapStatus('PAUSED')).toBe('live');
  });
});

describe('outcomeTypeFromDuration', () => {
  it('maps durations to outcome types', () => {
    expect(outcomeTypeFromDuration('REGULAR')).toBe('regulation');
    expect(outcomeTypeFromDuration('EXTRA_TIME')).toBe('extra_time');
    expect(outcomeTypeFromDuration('PENALTY_SHOOTOUT')).toBe('penalties');
  });
  it('is null for unknown', () => {
    expect(outcomeTypeFromDuration(null)).toBeNull();
  });
});

describe('isKnockoutStage / stageKey', () => {
  it('recognises knockout stages', () => {
    for (const s of ['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL']) {
      expect(isKnockoutStage(s)).toBe(true);
    }
  });
  it('treats the group stage as non-knockout', () => {
    expect(isKnockoutStage('GROUP_STAGE')).toBe(false);
    expect(isKnockoutStage(null)).toBe(false);
  });
  it('maps stages to coarse keys', () => {
    expect(stageKey('GROUP_STAGE')).toBe('group');
    expect(stageKey('LAST_32')).toBe('round_of_32');
    expect(stageKey('QUARTER_FINALS')).toBe('quarter');
    expect(stageKey('FINAL')).toBe('final');
  });
});

describe('flagForCountry', () => {
  it('maps known World Cup nations to flagcdn codes', () => {
    expect(flagForCountry('Brazil')).toBe('br');
    expect(flagForCountry('South Korea')).toBe('kr');
    expect(flagForCountry('United States')).toBe('us');
  });
  it('uses gb-eng / gb-sct for England and Scotland', () => {
    expect(flagForCountry('England')).toBe('gb-eng');
    expect(flagForCountry('Scotland')).toBe('gb-sct');
  });
  it('returns null for unknown teams (e.g. TBD)', () => {
    expect(flagForCountry('TBD')).toBeNull();
    expect(flagForCountry(null)).toBeNull();
  });
});

describe('mapMatchToRow', () => {
  it('maps a finished group match (regulation)', () => {
    const m = {
      id: 537327,
      utcDate: '2026-06-11T19:00:00Z',
      status: 'FINISHED',
      stage: 'GROUP_STAGE',
      homeTeam: { name: 'Mexico' },
      awayTeam: { name: 'South Africa' },
      score: { duration: 'REGULAR', fullTime: { home: 2, away: 0 }, halfTime: { home: 1, away: 0 } }
    };
    expect(mapMatchToRow(m)).toMatchObject({
      external_id: '537327',
      home_team: 'Mexico',
      away_team: 'South Africa',
      stage: 'group',
      is_knockout: false,
      status: 'finished',
      home_fulltime: 2,
      away_fulltime: 0,
      outcome_type: 'regulation',
      home_penalty: null,
      away_penalty: null
    });
    expect(mapMatchToRow(m).home_team_flag).toBe('mx');
  });

  it('maps an upcoming knockout match with undecided teams to TBD', () => {
    const m = {
      id: 99,
      utcDate: '2026-07-05T19:00:00Z',
      status: 'TIMED',
      stage: 'LAST_16',
      homeTeam: { name: null },
      awayTeam: { name: null },
      score: { duration: 'REGULAR', fullTime: { home: null, away: null } }
    };
    expect(mapMatchToRow(m)).toMatchObject({
      home_team: 'TBD',
      away_team: 'TBD',
      home_team_flag: null,
      is_knockout: true,
      status: 'scheduled',
      home_fulltime: null,
      outcome_type: null
    });
  });

  it('reconstructs the pre-shootout deciding score for penalties', () => {
    // football-data folds the shootout into fullTime (1-1 + 6-5 = 7-6); we
    // must report the level score (1-1) plus the shootout (6-5) separately.
    const m = {
      id: 1,
      utcDate: '2026-07-10T19:00:00Z',
      status: 'FINISHED',
      stage: 'FINAL',
      homeTeam: { name: 'Germany' },
      awayTeam: { name: 'Brazil' },
      score: {
        winner: 'HOME_TEAM',
        duration: 'PENALTY_SHOOTOUT',
        fullTime: { home: 7, away: 6 },
        regularTime: { home: 1, away: 1 },
        extraTime: { home: 0, away: 0 },
        penalties: { home: 6, away: 5 }
      }
    };
    expect(mapMatchToRow(m)).toMatchObject({
      outcome_type: 'penalties',
      home_fulltime: 1,
      away_fulltime: 1,
      home_penalty: 6,
      away_penalty: 5
    });
  });

  it('falls back to fullTime minus penalties when regularTime is absent', () => {
    const m = {
      id: 2,
      utcDate: '2026-07-10T19:00:00Z',
      status: 'FINISHED',
      stage: 'QUARTER_FINALS',
      homeTeam: { name: 'Spain' },
      awayTeam: { name: 'France' },
      score: {
        duration: 'PENALTY_SHOOTOUT',
        fullTime: { home: 5, away: 6 },
        penalties: { home: 4, away: 5 }
      }
    };
    expect(mapMatchToRow(m)).toMatchObject({
      home_fulltime: 1,
      away_fulltime: 1,
      home_penalty: 4,
      away_penalty: 5
    });
  });

  it('maps extra-time matches using fullTime directly', () => {
    const m = {
      id: 3,
      utcDate: '2026-07-08T19:00:00Z',
      status: 'FINISHED',
      stage: 'SEMI_FINALS',
      homeTeam: { name: 'Portugal' },
      awayTeam: { name: 'Argentina' },
      score: { duration: 'EXTRA_TIME', fullTime: { home: 2, away: 1 }, regularTime: { home: 1, away: 1 } }
    };
    expect(mapMatchToRow(m)).toMatchObject({
      outcome_type: 'extra_time',
      home_fulltime: 2,
      away_fulltime: 1,
      home_penalty: null
    });
  });

  it('does not expose scores for an in-progress match', () => {
    const m = {
      id: 4,
      utcDate: '2026-07-01T18:00:00Z',
      status: 'IN_PLAY',
      stage: 'GROUP_STAGE',
      homeTeam: { name: 'Italy' },
      awayTeam: { name: 'England' },
      score: { duration: 'REGULAR', fullTime: { home: 1, away: 0 } }
    };
    const row = mapMatchToRow(m);
    expect(row.status).toBe('live');
    expect(row.home_fulltime).toBeNull();
    expect(row.away_fulltime).toBeNull();
  });

  it('clamps out-of-range / non-integer goals to null', () => {
    const m = {
      id: 5,
      utcDate: '2026-07-01T18:00:00Z',
      status: 'FINISHED',
      stage: 'FINAL',
      homeTeam: { name: 'A' },
      awayTeam: { name: 'B' },
      score: { duration: 'REGULAR', fullTime: { home: 999, away: "3'); drop table matches;--" } }
    };
    const row = mapMatchToRow(m);
    expect(row.home_fulltime).toBeNull();
    expect(row.away_fulltime).toBeNull();
  });

  it('rejects payloads missing id or a valid date', () => {
    expect(mapMatchToRow(null)).toBeNull();
    expect(mapMatchToRow({})).toBeNull();
    expect(mapMatchToRow({ id: 1, utcDate: 'not-a-date' })).toBeNull();
  });
});
