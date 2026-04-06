import { TournamentAlgorithm } from './algorithm.js';
import { StorageService } from './storage.js';
import {
  DEFAULT_ROUNDS,
  PLAYERS_PER_COURT,
  TOAST_DURATION_MS,
  UNNAMED_TOURNAMENT,
  MAX_NAME_LENGTH
} from './constants.js';

export const tournamentApp = {
  // ─── STATE ───────────────────────────────────────────────
  currentTab: 'setup',
  currentTournamentId: null,
  isSyncing: false, // Prevent sync loops

  // Setup
  courts: [],
  newCourtName: '',
  rounds: DEFAULT_ROUNDS,
  tournamentName: '',
  players: [],
  newPlayerName: '',
  showCSVImport: false,
  csvInput: '',

  // Schedule
  schedule: [],
  currentRound: 0,
  scores: {},

  // UI
  modal: {
    show: false,
    title: '',
    message: '',
    isDanger: false,
    resolve: null
  },
  tournamentManagerOpen: false,
  tournamentList: [], // Will be populated when modal opens
  statisticsSort: {
    key: 'player',
    asc: true
  },
  toast: {
    show: false,
    message: ''
  },

  // ─── COMPUTED ────────────────────────────────────────────
  get playerCountStatus() {
    const n = this.players.length;
    if (n < PLAYERS_PER_COURT) {
      return {
        text: `Add at least ${PLAYERS_PER_COURT-n} more player${PLAYERS_PER_COURT-n>1?'s':''}`,
        class: 'warn'
      };
    }
    return {
      text: `${n} player${n>1?'s':''} ready ✓`,
      class: 'ok'
    };
  },

  get courtCountStatus() {
    const n = this.courts.length;
    if (n < 1) {
      return {
        text: 'Add at least 1 court',
        class: 'warn'
      };
    }
    return {
      text: `${n} court${n>1?'s':''} ready ✓`,
      class: 'ok'
    };
  },

  get currentRoundMatches() {
    if (!this.schedule[this.currentRound]) return [];
    return this.schedule[this.currentRound].matches;
  },

  get currentRoundSitting() {
    if (!this.schedule[this.currentRound]) return [];
    return this.schedule[this.currentRound].sitting || [];
  },

  // Helper to ensure score object exists
  getScore(round, match) {
    const key = `${round}-${match}`;
    if (!this.scores[key]) {
      // Create new score object
      this.scores[key] = { s1: '', s2: '' };
      // Force save since Alpine might not detect this deep change
      this.$nextTick(() => this.autoSave());
    }
    return this.scores[key];
  },

  get leaderboard() {
    const stats = {};
    this.players.forEach(p => {
      stats[p] = {ptsWon: 0, ptsLost: 0, games: 0, wins: 0};
    });

    this.schedule.forEach((round, r) => {
      round.matches.forEach((m, mi) => {
        const key = `${r}-${mi}`;
        const sc = this.scores[key];
        if (!sc || sc.s1 == null || sc.s2 == null || sc.s1 === '' || sc.s2 === '') return;

        const s1 = parseInt(sc.s1) || 0;
        const s2 = parseInt(sc.s2) || 0;
        const t1 = m.t1.map(i => this.players[i]);
        const t2 = m.t2.map(i => this.players[i]);

        t1.forEach(p => {
          if (stats[p]) {
            stats[p].ptsWon += s1;
            stats[p].ptsLost += s2;
            stats[p].games++;
            if (s1 > s2) stats[p].wins++;
          }
        });

        t2.forEach(p => {
          if (stats[p]) {
            stats[p].ptsWon += s2;
            stats[p].ptsLost += s1;
            stats[p].games++;
            if (s2 > s1) stats[p].wins++;
          }
        });
      });
    });

    const sorted = this.players.slice().sort((a, b) => {
      const da = stats[a];
      const db = stats[b];
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;

      if (db.ptsWon !== da.ptsWon) return db.ptsWon - da.ptsWon;
      const diffA = da.ptsWon - da.ptsLost;
      const diffB = db.ptsWon - db.ptsLost;
      if (diffB !== diffA) return diffB - diffA;
      return db.wins - da.wins;
    });

    const rankCls = ['gold', 'silver', 'bronze'];
    const podiumCls = ['podium-1', 'podium-2', 'podium-3'];
    let currentRank = 1;
    let previousStats = null;

    return sorted.map((player, i) => {
      const s = stats[player];
      if (!s) return null;

      if (previousStats &&
          s.ptsWon === previousStats.ptsWon &&
          (s.ptsWon - s.ptsLost) === (previousStats.ptsWon - previousStats.ptsLost) &&
          s.wins === previousStats.wins) {
        // Tied
      } else {
        currentRank = i + 1;
      }

      previousStats = s;
      const diff = s.ptsWon - s.ptsLost;

      return {
        player,
        rank: currentRank,
        ptsWon: s.ptsWon,
        ptsLost: s.ptsLost,
        games: s.games,
        wins: s.wins,
        diffStr: diff === 0 ? '—' : (diff > 0 ? '+'+diff : ''+diff),
        diffClass: diff > 0 ? 'pos' : diff < 0 ? 'neg' : '',
        rankClass: rankCls[currentRank - 1] || '',
        podiumClass: podiumCls[currentRank - 1] || ''
      };
    }).filter(Boolean);
  },

  get playerStatistics() {
    const stats = this.players.map(player => {
      const playerIndex = this.players.indexOf(player);
      let games = 0;
      let sitOuts = 0;
      const partnerCounts = {};
      const opponentCounts = {};

      this.schedule.forEach(round => {
        // Check if sitting
        if (round.sitting.includes(playerIndex)) {
          sitOuts++;
          return;
        }

        // Find match for this player
        const match = round.matches.find(m =>
          m.t1.includes(playerIndex) || m.t2.includes(playerIndex)
        );

        if (match) {
          games++;

          // Track partner
          let partner;
          if (match.t1.includes(playerIndex)) {
            partner = match.t1.find(p => p !== playerIndex);
          } else {
            partner = match.t2.find(p => p !== playerIndex);
          }
          if (partner !== undefined) {
            partnerCounts[partner] = (partnerCounts[partner] || 0) + 1;
          }

          // Track opponents
          const opponents = match.t1.includes(playerIndex) ? match.t2 : match.t1;
          opponents.forEach(opp => {
            opponentCounts[opp] = (opponentCounts[opp] || 0) + 1;
          });
        }
      });

      const partnerValues = Object.values(partnerCounts);
      const opponentValues = Object.values(opponentCounts);

      return {
        player,
        games,
        uniquePartners: Object.keys(partnerCounts).length,
        maxPartner: partnerValues.length > 0 ? Math.max(...partnerValues) : 0,
        uniqueOpponents: Object.keys(opponentCounts).length,
        maxOpponent: opponentValues.length > 0 ? Math.max(...opponentValues) : 0,
        sitOuts
      };
    });

    return stats;
  },

  get sortedStatistics() {
    const stats = [...this.playerStatistics];
    const key = this.statisticsSort.key;
    const asc = this.statisticsSort.asc;

    stats.sort((a, b) => {
      let valA = a[key];
      let valB = b[key];

      // String comparison for player names
      if (key === 'player') {
        return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      // Numeric comparison
      if (asc) {
        return valA - valB;
      } else {
        return valB - valA;
      }
    });

    return stats;
  },

  // ─── PLAYER MANAGEMENT ───────────────────────────────────
  addCourt() {
    const name = this.newCourtName.trim();
    if (name && !this.courts.includes(name)) {
      this.courts.push(name);
      this.newCourtName = '';
      this.autoSave();
    }
  },

  removeCourt(index) {
    this.courts.splice(index, 1);
    this.autoSave();
  },

  quickFillCourts(count) {
    this.courts = Array.from({length: count}, (_, i) => String(i + 1));
    this.autoSave();
  },

  clearCourts() {
    this.courts = [];
    this.autoSave();
  },

  addPlayer() {
    const name = this.newPlayerName.trim();
    if (name && !this.players.includes(name)) {
      this.players.push(name);
      this.newPlayerName = '';
      this.autoSave();
    }
  },

  removePlayer(index) {
    this.players.splice(index, 1);
    this.autoSave();
  },

  quickFillPlayers(count) {
    this.players = Array.from({length: count}, (_, i) => 'Player ' + (i + 1));
    this.autoSave();
  },

  clearPlayers() {
    this.players = [];
    this.autoSave();
  },

  importCSV() {
    if (!this.csvInput.trim()) return;

    const names = this.csvInput
      .split(/[\n,]/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length <= MAX_NAME_LENGTH);

    if (names.length === 0) {
      alert('No valid player names found');
      return;
    }

    let added = 0;
    names.forEach(n => {
      if (!this.players.includes(n)) {
        this.players.push(n);
        added++;
      }
    });

    this.showCSVImport = false;
    this.csvInput = '';
    this.autoSave();

    if (added > 0) {
      this.showToast(`✓ ${added} player${added>1?'s':''} imported`);
    }
  },

  // ─── SCHEDULE GENERATION ─────────────────────────────────
  generateSchedule() {
    if (this.players.length < PLAYERS_PER_COURT || this.courts.length < 1) return;

    if (!this.currentTournamentId) {
      this.currentTournamentId = StorageService.generateId();
    }

    const { schedule } = TournamentAlgorithm.generateSchedule(
      this.players.length,
      this.courts.length,
      this.rounds
    );
    this.schedule = schedule;

    // Initialize scores
    this.scores = {};
    this.schedule.forEach((round, r) => {
      round.matches.forEach((_, mi) => {
        this.scores[`${r}-${mi}`] = { s1: '', s2: '' };
      });
    });

    this.currentRound = 0;
    this.currentTab = 'schedule';
    this.autoSave();
  },

  // ─── NAVIGATION ──────────────────────────────────────────
  prevRound() {
    if (this.currentRound > 0) {
      this.currentRound--;
      this.autoSave();
    }
  },

  nextRound() {
    if (this.currentRound < this.schedule.length - 1) {
      this.currentRound++;
      this.autoSave();
    }
  },

  // ─── MODALS ──────────────────────────────────────────────
  async confirm(title, message, isDanger = false) {
    return new Promise((resolve) => {
      this.modal = {
        show: true,
        title,
        message,
        isDanger,
        resolve
      };
    });
  },

  showToast(message) {
    this.toast.message = message;
    this.toast.show = true;
    setTimeout(() => {
      this.toast.show = false;
    }, TOAST_DURATION_MS);
  },

  // ─── TOURNAMENT MANAGEMENT ───────────────────────────────
  async newTournament(skipConfirm = false) {
    if (this.schedule.length > 0 && !skipConfirm) {
      const confirmed = await this.confirm(
        'Start New Tournament?',
        'Your current tournament will be saved. Do you want to start a new one?'
      );
      if (!confirmed) return;
    }

    this.currentTournamentId = null;
    this.players = [];
    this.courts = [];
    this.schedule = [];
    this.scores = {};
    this.currentRound = 0;
    this.rounds = DEFAULT_ROUNDS;
    this.tournamentName = '';
    this.currentTab = 'setup';
  },

  showTournamentManagerModal() {
    // Refresh the list from storage
    this.tournamentList = StorageService.getTournamentsList();
    this.tournamentList.sort((a, b) => b.lastModified - a.lastModified);

    if (this.tournamentList.length === 0) {
      alert('No saved tournaments found.');
      return;
    }
    this.tournamentManagerOpen = true;
  },

  loadTournamentById(id) {
    const state = StorageService.loadTournament(id);
    if (!state) return;

    this.currentTournamentId = state.id;
    this.players = state.players || [];
    this.courts = state.courts || [];
    this.schedule = state.schedule || [];
    this.scores = state.scores || {};
    this.rounds = state.rounds || DEFAULT_ROUNDS;
    this.tournamentName = state.name || '';
    // currentRound not loaded - start at 0

    this.tournamentManagerOpen = false;
    if (this.schedule.length > 0) {
      this.currentTab = 'schedule';
      this.currentRound = 0;
    }
    this.showToast('✓ Tournament loaded');
  },

  async deleteTournamentById(id) {
    const tournament = this.tournamentList.find(t => t.id === id);
    if (!tournament) return;

    const confirmed = await this.confirm(
      'Delete Tournament?',
      `Delete "${tournament.name}"? This cannot be undone.`,
      true
    );

    if (!confirmed) return;

    if (StorageService.deleteTournament(id)) {
      if (id === this.currentTournamentId) {
        // Skip the "new tournament" confirmation since we already confirmed deletion
        await this.newTournament(true);
      }
      // Refresh the list
      this.tournamentList = StorageService.getTournamentsList();
      this.tournamentList.sort((a, b) => b.lastModified - a.lastModified);
      this.showToast('✓ Tournament deleted');
    }
  },

  // ─── EXPORT ──────────────────────────────────────────────
  sortStatistics(key) {
    if (this.statisticsSort.key === key) {
      this.statisticsSort.asc = !this.statisticsSort.asc;
    } else {
      this.statisticsSort.key = key;
      this.statisticsSort.asc = key === 'player'; // Default ascending for names, descending for numbers
    }
  },

  copyLeaderboardCSV() {
    const headers = ['Rank','Player','Pts Won','Pts Lost','+/-','Games','Wins'];
    const rows = [headers.join(',')];

    this.leaderboard.forEach(entry => {
      const row = [
        entry.rank,
        entry.player,
        entry.ptsWon,
        entry.ptsLost,
        entry.diffStr,
        entry.games,
        entry.wins
      ];
      rows.push(row.join(','));
    });

    navigator.clipboard.writeText(rows.join('\n'))
      .then(() => this.showToast('✓ Leaderboard CSV copied'))
      .catch(() => alert('Could not copy. Try printing instead.'));
  },

  copyStatisticsCSV() {
    const headers = ['Player','Games','Unique Partners','Max w/ Same','Unique Opponents','Max vs Same','Sit-outs'];
    const rows = [headers.join(',')];

    this.sortedStatistics.forEach(stat => {
      const row = [
        stat.player,
        stat.games,
        stat.uniquePartners,
        stat.maxPartner,
        stat.uniqueOpponents,
        stat.maxOpponent,
        stat.sitOuts
      ];
      rows.push(row.join(','));
    });

    navigator.clipboard.writeText(rows.join('\n'))
      .then(() => this.showToast('✓ Statistics CSV copied'))
      .catch(() => alert('Could not copy.'));
  },

  // ─── PERSISTENCE ─────────────────────────────────────────
  autoSave() {
    // Don't save while syncing from another window
    if (this.isSyncing) return;

    if (this.players.length === 0 && this.schedule.length === 0) return;

    const state = {
      id: this.currentTournamentId,
      name: this.tournamentName || UNNAMED_TOURNAMENT,
      players: this.players,
      courts: this.courts,
      schedule: this.schedule,
      scores: this.scores,
      rounds: this.rounds,
      tournamentName: this.tournamentName
      // Note: currentRound excluded - it's UI state, not tournament data
    };

    const savedId = StorageService.saveTournament(state);
    if (savedId && !this.currentTournamentId) {
      this.currentTournamentId = savedId;
    }
  },

  formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  },

  // ─── INITIALIZATION ──────────────────────────────────────
  init() {
    // Migrate legacy data
    StorageService.migrateLegacyData();

    // Load most recent tournament
    const state = StorageService.loadMostRecent();
    if (state) {
      this.currentTournamentId = state.id;
      this.players = state.players || [];
      this.courts = state.courts || [];
      this.schedule = state.schedule || [];
      this.scores = state.scores || {};
      this.rounds = state.rounds || DEFAULT_ROUNDS;
      this.tournamentName = state.name || '';
      // currentRound stays at 0 (default) - it's UI state

      if (this.schedule.length > 0) {
        this.showToast('🏸 Tournament restored from last session');
      }
    } else {
      // Default courts if nothing loaded
      this.courts = ['1', '2'];
    }

    // Auto-save on changes
    this.$watch('courts', () => this.autoSave());
    this.$watch('rounds', () => this.autoSave());
    this.$watch('tournamentName', () => this.autoSave());
    this.$watch('scores', () => this.autoSave(), { deep: true });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (this.currentTab === 'schedule' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        if (e.key === 'ArrowLeft') { this.prevRound(); e.preventDefault(); }
        if (e.key === 'ArrowRight') { this.nextRound(); e.preventDefault(); }
      }

      if (e.key === 'f' || e.key === 'F') {
        if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
          this.toggleFullscreen();
          e.preventDefault();
        }
      }
    });

    // Cross-tab sync
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.startsWith(StorageService.STORAGE_KEY_PREFIX) && e.newValue) {
        const tournamentId = e.key.replace(StorageService.STORAGE_KEY_PREFIX, '');
        if (tournamentId === this.currentTournamentId) {
          // Set flag to prevent sync loop
          this.isSyncing = true;

          // Reload state but preserve UI state (tab and round) so each window can view independently
          const currentTab = this.currentTab;
          const currentRound = this.currentRound;

          const state = StorageService.loadTournament(tournamentId);
          if (state) {
            this.players = state.players || [];
            this.courts = state.courts || [];
            this.schedule = state.schedule || [];
            this.scores = state.scores || {};
            this.rounds = state.rounds || DEFAULT_ROUNDS;
            this.tournamentName = state.name || '';
          }

          this.currentTab = currentTab;
          this.currentRound = currentRound;

          // Clear flag after a tick to allow watchers to settle
          this.$nextTick(() => {
            this.isSyncing = false;
          });

          this.showToast('↻ synced');
        }
      }
    });

    // Fullscreen hint
    setTimeout(() => {
      if (this.currentTab === 'schedule' && this.schedule.length > 0) {
        const hint = document.createElement('div');
        hint.className = 'fullscreen-hint show';
        hint.textContent = 'Press F for fullscreen';
        document.body.appendChild(hint);
        setTimeout(() => {
          hint.classList.remove('show');
          setTimeout(() => hint.remove(), 300);
        }, 3000);
      }
    }, 1000);
  },

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log('Fullscreen error:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }
};
