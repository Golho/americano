import { UNNAMED_TOURNAMENT, DEFAULT_ROUNDS } from './constants.js';

export const StorageService = {
  STORAGE_KEY_PREFIX: 'americano_tournament_',
  TOURNAMENTS_LIST_KEY: 'americano_tournaments_list',
  OLD_STORAGE_KEY: 'americano_tournament_v1',

  generateId() {
    return 'tournament_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  getTournamentsList() {
    try {
      const list = localStorage.getItem(this.TOURNAMENTS_LIST_KEY);
      return list ? JSON.parse(list) : [];
    } catch(e) { return []; }
  },

  saveTournamentsList(list) {
    try {
      localStorage.setItem(this.TOURNAMENTS_LIST_KEY, JSON.stringify(list));
    } catch(e) {}
  },

  saveTournament(state) {
    if (!state.id) {
      state.id = this.generateId();
    }

    state.lastModified = Date.now();

    try {
      localStorage.setItem(this.STORAGE_KEY_PREFIX + state.id, JSON.stringify(state));

      const list = this.getTournamentsList();
      const existingIndex = list.findIndex(t => t.id === state.id);
      const tournamentInfo = {
        id: state.id,
        name: state.name || UNNAMED_TOURNAMENT,
        playerCount: state.players.length,
        lastModified: state.lastModified
      };

      if (existingIndex >= 0) {
        list[existingIndex] = tournamentInfo;
      } else {
        list.push(tournamentInfo);
      }

      this.saveTournamentsList(list);
      return state.id;
    } catch(e) {
      return null;
    }
  },

  loadTournament(id) {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_PREFIX + id);
      return raw ? JSON.parse(raw) : null;
    } catch(e) {
      return null;
    }
  },

  loadMostRecent() {
    const list = this.getTournamentsList();
    if (list.length === 0) return null;
    list.sort((a, b) => b.lastModified - a.lastModified);
    return this.loadTournament(list[0].id);
  },

  deleteTournament(id) {
    try {
      localStorage.removeItem(this.STORAGE_KEY_PREFIX + id);
      const list = this.getTournamentsList();
      const filtered = list.filter(t => t.id !== id);
      this.saveTournamentsList(filtered);
      return true;
    } catch(e) {
      return false;
    }
  },

  migrateLegacyData() {
    try {
      const oldData = localStorage.getItem(this.OLD_STORAGE_KEY);
      if (!oldData) return;

      const oldTournament = JSON.parse(oldData);
      const newId = this.generateId();

      const migratedState = {
        id: newId,
        name: oldTournament.tname || 'Migrated Tournament',
        players: oldTournament.players || [],
        schedule: oldTournament.schedule || [],
        scores: oldTournament.scores || {},
        currentRound: oldTournament.currentRound || 0,
        courts: oldTournament.courts || 2,
        rounds: oldTournament.rounds || DEFAULT_ROUNDS,
        tournamentName: oldTournament.tname || '',
        lastModified: Date.now()
      };

      this.saveTournament(migratedState);
      localStorage.removeItem(this.OLD_STORAGE_KEY);
    } catch(e) {
      localStorage.removeItem(this.OLD_STORAGE_KEY);
    }
  }
};
