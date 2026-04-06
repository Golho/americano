import { describe, it, expect } from 'vitest'
import { TournamentAlgorithm } from './algorithm.js'

const generateSchedule = TournamentAlgorithm.generateSchedule.bind(TournamentAlgorithm)

// ─── BASIC SCHEDULE GENERATION ───────────────────────────────────────────────

describe('Basic schedule generation', () => {
  it('generates correct number of rounds', () => {
    const { schedule } = generateSchedule(8, 2, 5)
    expect(schedule).toHaveLength(5)
  })

  it('each round has correct number of matches', () => {
    const { schedule } = generateSchedule(12, 3, 4)
    schedule.forEach((round, i) => {
      expect(round.matches, `round ${i + 1}`).toHaveLength(3)
    })
  })

  it('each match has 4 players (2 teams of 2)', () => {
    const { schedule } = generateSchedule(16, 4, 3)
    schedule.forEach((round, ri) => {
      round.matches.forEach((match, mi) => {
        expect(match.t1, `r${ri + 1} m${mi + 1} team1`).toHaveLength(2)
        expect(match.t2, `r${ri + 1} m${mi + 1} team2`).toHaveLength(2)
      })
    })
  })

  it('works with minimum players (4)', () => {
    const { schedule } = generateSchedule(4, 1, 3)
    expect(schedule).toHaveLength(3)
    schedule.forEach(round => {
      expect(round.matches).toHaveLength(1)
      expect(round.sitting).toHaveLength(0)
    })
  })

  it('works with large player count (50)', () => {
    const { schedule } = generateSchedule(50, 6, 8)
    expect(schedule).toHaveLength(8)
    schedule.forEach(round => {
      expect(round.matches.length).toBeLessThanOrEqual(6)
    })
  })

  it('works with odd player counts', () => {
    const { schedule } = generateSchedule(9, 2, 3)
    expect(schedule).toHaveLength(3)
    schedule.forEach(round => {
      expect(round.sitting).toHaveLength(1)
    })
  })
})

// ─── PARTNER ROTATION ────────────────────────────────────────────────────────

describe('Partner rotation (Americano logic)', () => {
  it('players rotate partners across rounds', () => {
    const { pairCount } = generateSchedule(8, 2, 6)
    let totalPairings = 0
    for (let i = 0; i < 8; i++)
      for (let j = i + 1; j < 8; j++)
        if (pairCount[i][j] > 0) totalPairings++
    expect(totalPairings).toBeGreaterThan(5)
  })

  it('no player partners with themselves', () => {
    const { schedule } = generateSchedule(12, 3, 5)
    schedule.forEach((round, ri) => {
      round.matches.forEach((match, mi) => {
        const unique = new Set([...match.t1, ...match.t2])
        expect(unique.size, `r${ri + 1} m${mi + 1}`).toBe(4)
      })
    })
  })

  it('minimizes repeat partnerships', () => {
    const { pairCount } = generateSchedule(12, 3, 10)
    let highRepeatCount = 0
    for (let i = 0; i < 12; i++)
      for (let j = i + 1; j < 12; j++)
        if (pairCount[i][j] > 2) highRepeatCount++
    expect(highRepeatCount).toBeLessThan(15)
  })
})

// ─── PLAYER DISTRIBUTION ─────────────────────────────────────────────────────

describe('Player distribution', () => {
  it('each player plays roughly equal games', () => {
    const { schedule } = generateSchedule(10, 2, 8)
    const gamesPerPlayer = new Array(10).fill(0)
    schedule.forEach(round => {
      round.matches.forEach(match => {
        match.t1.forEach(p => gamesPerPlayer[p]++)
        match.t2.forEach(p => gamesPerPlayer[p]++)
      })
    })
    const min = Math.min(...gamesPerPlayer)
    const max = Math.max(...gamesPerPlayer)
    expect(max - min).toBeLessThanOrEqual(1)
  })

  it('sitting out rotates fairly', () => {
    const { schedule } = generateSchedule(13, 3, 6)
    const sitOutCount = new Array(13).fill(0)
    schedule.forEach(round => round.sitting.forEach(p => sitOutCount[p]++))
    const min = Math.min(...sitOutCount)
    const max = Math.max(...sitOutCount)
    expect(max - min).toBeLessThanOrEqual(1)
  })
})

// ─── COURT ASSIGNMENT ────────────────────────────────────────────────────────

describe('Court assignment', () => {
  it('courts are numbered correctly (0-indexed)', () => {
    const { schedule } = generateSchedule(16, 4, 3)
    schedule.forEach((round, ri) => {
      round.matches.forEach((match, mi) => {
        expect(match.court, `r${ri + 1} m${mi + 1}`).toBe(mi)
      })
    })
  })

  it('never exceeds available courts', () => {
    const { schedule } = generateSchedule(20, 3, 5)
    schedule.forEach((round, ri) => {
      expect(round.matches.length, `round ${ri + 1}`).toBeLessThanOrEqual(3)
    })
  })
})

// ─── EDGE CASES ──────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  it('handles exactly 4 players per court', () => {
    const { schedule } = generateSchedule(8, 2, 4)
    schedule.forEach(round => {
      const playing = new Set()
      round.matches.forEach(m => { m.t1.forEach(p => playing.add(p)); m.t2.forEach(p => playing.add(p)) })
      expect(playing.size).toBe(8)
      expect(round.sitting).toHaveLength(0)
    })
  })

  it('handles insufficient players for all courts', () => {
    const { schedule } = generateSchedule(6, 5, 3)
    schedule.forEach(round => {
      expect(round.matches).toHaveLength(1)
      expect(round.sitting).toHaveLength(2)
    })
  })

  it('no duplicate players in a single round', () => {
    const { schedule } = generateSchedule(20, 5, 4)
    schedule.forEach((round, ri) => {
      const seen = new Set()
      round.matches.forEach(match => {
        ;[...match.t1, ...match.t2].forEach(p => {
          expect(seen.has(p), `r${ri + 1}: player ${p} appears twice`).toBe(false)
          seen.add(p)
        })
      })
    })
  })

  it('handles 5 players (1 sits out each round)', () => {
    const { schedule } = generateSchedule(5, 1, 6)
    schedule.forEach((round, ri) => {
      expect(round.matches, `round ${ri + 1}`).toHaveLength(1)
      expect(round.sitting, `round ${ri + 1}`).toHaveLength(1)
    })
  })

  it('handles 6 players with 1 court (2 sit out)', () => {
    const { schedule } = generateSchedule(6, 1, 4)
    schedule.forEach((round, ri) => {
      expect(round.matches, `round ${ri + 1}`).toHaveLength(1)
      expect(round.sitting, `round ${ri + 1}`).toHaveLength(2)
    })
  })

  it('handles 7 players (3 sit out each round)', () => {
    const { schedule } = generateSchedule(7, 1, 5)
    schedule.forEach(round => {
      expect(round.matches).toHaveLength(1)
      expect(round.sitting).toHaveLength(3)
    })
  })

  it('handles large tournament (24 players, 6 courts, 12 rounds)', () => {
    const { schedule } = generateSchedule(24, 6, 12)
    expect(schedule).toHaveLength(12)
    schedule.forEach((round, ri) => {
      expect(round.matches, `round ${ri + 1}`).toHaveLength(6)
      expect(round.sitting, `round ${ri + 1}`).toHaveLength(0)
    })
  })

  it('handles 50 players, 10 courts', () => {
    const { schedule } = generateSchedule(50, 10, 8)
    expect(schedule).toHaveLength(8)
    schedule.forEach(round => {
      expect(round.matches).toHaveLength(10)
      expect(round.sitting).toHaveLength(10)
    })
  })

  it('handles many rounds (stress test, 12 players, 20 rounds)', () => {
    const { schedule } = generateSchedule(12, 3, 20)
    expect(schedule).toHaveLength(20)
    schedule.forEach((round, ri) => {
      expect(round.matches.length, `round ${ri + 1}`).toBeLessThanOrEqual(3)
      round.matches.forEach(match => {
        expect(match.t1).toHaveLength(2)
        expect(match.t2).toHaveLength(2)
      })
    })
  })
})

// ─── CONSISTENCY ─────────────────────────────────────────────────────────────

describe('Consistency', () => {
  it('multiple generations all produce valid schedules', () => {
    for (let i = 0; i < 5; i++) {
      const { schedule } = generateSchedule(16, 4, 5)
      expect(schedule).toHaveLength(5)
      schedule.forEach(round => {
        round.matches.forEach(match => {
          expect(match.t1).toHaveLength(2)
          expect(match.t2).toHaveLength(2)
        })
      })
    }
  })
})

// ─── PARTNER ROTATION STRESS TESTS ───────────────────────────────────────────

describe('Partner rotation stress tests', () => {
  it('minimizes repeats with many rounds (16 players, 10 rounds)', () => {
    const { pairCount } = generateSchedule(16, 4, 10)
    let maxRepeats = 0
    for (let i = 0; i < 16; i++)
      for (let j = i + 1; j < 16; j++)
        maxRepeats = Math.max(maxRepeats, pairCount[i][j])
    expect(maxRepeats).toBeLessThanOrEqual(3)
  })

  it('good partner distribution (8 players, 6 rounds)', () => {
    const { pairCount } = generateSchedule(8, 2, 6)
    const uniquePartnersPerPlayer = new Array(8).fill(0)
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 8; j++)
        if (i !== j && pairCount[i][j] > 0) uniquePartnersPerPlayer[i]++
    uniquePartnersPerPlayer.forEach((count, player) => {
      expect(count, `player ${player}`).toBeGreaterThanOrEqual(3)
    })
  })
})

// ─── FAIRNESS ACROSS CONFIGURATIONS ─────────────────────────────────────────

describe('Fairness across configurations', () => {
  it('fair game distribution: 11 players, 2 courts, 10 rounds', () => {
    const { schedule } = generateSchedule(11, 2, 10)
    const games = new Array(11).fill(0)
    schedule.forEach(round => round.matches.forEach(m => { m.t1.forEach(p => games[p]++); m.t2.forEach(p => games[p]++) }))
    expect(Math.max(...games) - Math.min(...games)).toBeLessThanOrEqual(1)
  })

  it('fair game distribution: 15 players, 3 courts, 12 rounds', () => {
    const { schedule } = generateSchedule(15, 3, 12)
    const games = new Array(15).fill(0)
    schedule.forEach(round => round.matches.forEach(m => { m.t1.forEach(p => games[p]++); m.t2.forEach(p => games[p]++) }))
    expect(Math.max(...games) - Math.min(...games)).toBeLessThanOrEqual(1)
  })

  it('fair game distribution: 20 players, 5 courts, 8 rounds', () => {
    const { schedule } = generateSchedule(20, 5, 8)
    const games = new Array(20).fill(0)
    schedule.forEach(round => round.matches.forEach(m => { m.t1.forEach(p => games[p]++); m.t2.forEach(p => games[p]++) }))
    expect(Math.max(...games) - Math.min(...games)).toBeLessThanOrEqual(1)
  })

  it('fair game distribution: 50 players, 6 courts, 6 rounds', () => {
    const { schedule } = generateSchedule(50, 6, 6)
    const games = new Array(50).fill(0)
    schedule.forEach(round => round.matches.forEach(m => { m.t1.forEach(p => games[p]++); m.t2.forEach(p => games[p]++) }))
    expect(Math.max(...games) - Math.min(...games)).toBeLessThanOrEqual(1)
  })
})

// ─── SIT-OUT FAIRNESS ────────────────────────────────────────────────────────

describe('Sit-out fairness', () => {
  it('fair sit-outs: 9 players, 2 courts, 10 rounds', () => {
    const { schedule } = generateSchedule(9, 2, 10)
    const sitOuts = new Array(9).fill(0)
    schedule.forEach(round => round.sitting.forEach(p => sitOuts[p]++))
    expect(Math.max(...sitOuts) - Math.min(...sitOuts)).toBeLessThanOrEqual(2)
  })

  it('fair sit-outs: 17 players, 4 courts, 8 rounds', () => {
    const { schedule } = generateSchedule(17, 4, 8)
    const sitOuts = new Array(17).fill(0)
    schedule.forEach(round => round.sitting.forEach(p => sitOuts[p]++))
    expect(Math.max(...sitOuts) - Math.min(...sitOuts)).toBeLessThanOrEqual(2)
  })
})

// ─── COURT UTILIZATION ───────────────────────────────────────────────────────

describe('Court utilization', () => {
  it('maximizes court usage with enough players', () => {
    const { schedule } = generateSchedule(30, 5, 6)
    schedule.forEach((round, ri) => {
      expect(round.matches, `round ${ri + 1}`).toHaveLength(5)
    })
  })

  it('handles more courts than needed', () => {
    const { schedule } = generateSchedule(8, 10, 4)
    schedule.forEach(round => {
      expect(round.matches).toHaveLength(2)
    })
  })
})

// ─── STRUCTURAL INTEGRITY ────────────────────────────────────────────────────

describe('Structural integrity', () => {
  it('all players accounted for each round', () => {
    const { schedule } = generateSchedule(14, 3, 8)
    schedule.forEach((round, ri) => {
      const playing = new Set()
      round.matches.forEach(m => { m.t1.forEach(p => playing.add(p)); m.t2.forEach(p => playing.add(p)) })
      const sitting = new Set(round.sitting)
      expect(playing.size + sitting.size, `round ${ri + 1}`).toBe(14)
      round.sitting.forEach(p => {
        expect(playing.has(p), `r${ri + 1}: player ${p} both plays and sits`).toBe(false)
      })
    })
  })

  it('team composition is always 2v2', () => {
    const { schedule } = generateSchedule(18, 4, 10)
    schedule.forEach((round, ri) => {
      round.matches.forEach((match, mi) => {
        expect(match.t1, `r${ri + 1} m${mi + 1} team1`).toHaveLength(2)
        expect(match.t2, `r${ri + 1} m${mi + 1} team2`).toHaveLength(2)
        expect(new Set([...match.t1, ...match.t2]).size, `r${ri + 1} m${mi + 1} unique players`).toBe(4)
      })
    })
  })
})

// ─── RANDOMNESS ──────────────────────────────────────────────────────────────

describe('Randomness', () => {
  it('generates different schedules on multiple runs', () => {
    const schedules = new Set()
    for (let i = 0; i < 3; i++)
      schedules.add(JSON.stringify(generateSchedule(8, 2, 4).schedule))
    expect(schedules.size).toBeGreaterThanOrEqual(2)
  })
})

// ─── PERFORMANCE ─────────────────────────────────────────────────────────────

describe('Performance', () => {
  it('completes medium complexity in <5s (20 players, 5 courts, 10 rounds)', () => {
    const start = performance.now()
    generateSchedule(20, 5, 10)
    expect(performance.now() - start).toBeLessThan(5000)
  })

  it('completes high complexity in <10s (40 players, 8 courts, 12 rounds)', () => {
    const start = performance.now()
    generateSchedule(40, 8, 12)
    expect(performance.now() - start).toBeLessThan(10000)
  })
})
