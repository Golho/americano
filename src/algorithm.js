import { PLAYERS_PER_COURT, MAX_SHUFFLE_ATTEMPTS } from './constants.js';

export const TournamentAlgorithm = {
  generateSchedule(playerCount, courts, numRounds) {
    const pairCount = Array.from({length: playerCount}, () => new Array(playerCount).fill(0));
    const gamesPlayed = new Array(playerCount).fill(0);
    const schedule = [];

    for (let r = 0; r < numRounds; r++) {
      // Step 1: Sort all players by games played (fewest first)
      const playersByGames = Array.from({length: playerCount}, (_, i) => ({
        id: i,
        games: gamesPlayed[i],
        random: Math.random() // Break ties randomly
      }))
      .sort((a, b) => {
        if (a.games !== b.games) return a.games - b.games; // Fewer games first
        return a.random - b.random; // Random tiebreaker for ties
      });

      // Step 2: Select the N players with fewest games for this round
      const slotsNeeded = Math.min(PLAYERS_PER_COURT * courts, playerCount);
      const playersThisRound = playersByGames.slice(0, slotsNeeded).map(p => p.id);

      // Step 3: Arrange these players to minimize repeat partners
      let bestOrder = null;
      let bestPairScore = Infinity;
      const attempts = Math.min(MAX_SHUFFLE_ATTEMPTS, playersThisRound.length * 5);

      for (let attempt = 0; attempt < attempts; attempt++) {
        const order = this.shuffle([...playersThisRound]);
        let pairScore = 0;

        for (let c = 0; c < courts; c++) {
          const base = c * PLAYERS_PER_COURT;
          if (base + 3 >= order.length) break;
          pairScore += pairCount[order[base]][order[base+1]];
          pairScore += pairCount[order[base+2]][order[base+3]];
        }

        if (pairScore < bestPairScore) {
          bestPairScore = pairScore;
          bestOrder = order;
        }
      }

      const roundMatches = [];
      const order = bestOrder;
      const usedThisRound = new Set();

      for (let c = 0; c < courts; c++) {
        const base = c * PLAYERS_PER_COURT;
        if (base + 3 >= order.length) break;
        const [a, b, cc, d] = [order[base], order[base+1], order[base+2], order[base+3]];
        pairCount[a][b]++; pairCount[b][a]++;
        pairCount[cc][d]++; pairCount[d][cc]++;
        usedThisRound.add(a); usedThisRound.add(b); usedThisRound.add(cc); usedThisRound.add(d);
        gamesPlayed[a]++; gamesPlayed[b]++; gamesPlayed[cc]++; gamesPlayed[d]++;
        roundMatches.push({ court: c, t1: [a, b], t2: [cc, d] });
      }

      // Sitting = all players who aren't in usedThisRound
      const sitting = Array.from({length: playerCount}, (_, i) => i).filter(i => !usedThisRound.has(i));
      schedule.push({ matches: roundMatches, sitting });
    }

    return { schedule, pairCount };
  },

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
};
