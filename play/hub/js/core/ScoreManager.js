import { StorageManager } from "./StorageManager.js";

const K_SCORES = "ogh_scores";             // { gameId: bestScore }
const K_FAVORITES = "ogh_favorites";       // [gameId]
const K_RECENT = "ogh_recent";             // [{ gameId, ts }]
const K_STATS = "ogh_stats";               // { totalPlays, wins, perGame }
const K_ACHIEVEMENTS = "ogh_achievements"; // [achievementId]

const emptyStats = () => ({ totalPlays: 0, wins: 0, perGame: {} });

export const ScoreManager = {
  async getBest(gameId) {
    const scores = (await StorageManager.get(K_SCORES, {})) || {};
    return scores[gameId] ?? 0;
  },
  async getAllBest() { return (await StorageManager.get(K_SCORES, {})) || {}; },

  async submitScore(gameId, score) {
    const scores = (await StorageManager.get(K_SCORES, {})) || {};
    const prevBest = scores[gameId] ?? 0;
    const isNewBest = score > prevBest;
    if (isNewBest) {
      scores[gameId] = score;
      await StorageManager.set(K_SCORES, scores);
      if (prevBest > 0) await AchievementsAPI.unlock("new_high_score");
      if (Object.keys(scores).length >= 10) await AchievementsAPI.unlock("explorer");
    }
    return { isNewBest, prevBest, best: Math.max(prevBest, score) };
  },

  async recordWin() {
    const stats = await this.getStats();
    stats.wins = (stats.wins || 0) + 1;
    await StorageManager.set(K_STATS, stats);
    if (stats.wins === 1) await AchievementsAPI.unlock("first_win");
    if (stats.wins === 10) await AchievementsAPI.unlock("ten_wins");
  },

  async resetScores() { await StorageManager.set(K_SCORES, {}); },

  async getFavorites() { return (await StorageManager.get(K_FAVORITES, [])) || []; },
  async toggleFavorite(gameId) {
    let favs = await this.getFavorites();
    favs = favs.includes(gameId) ? favs.filter((id) => id !== gameId) : [...favs, gameId];
    await StorageManager.set(K_FAVORITES, favs);
    return favs;
  },
  async resetFavorites() { await StorageManager.set(K_FAVORITES, []); },

  async getRecent() { return (await StorageManager.get(K_RECENT, [])) || []; },
  async recordPlay(gameId) {
    let recent = await this.getRecent();
    recent = recent.filter((r) => r.gameId !== gameId);
    recent.unshift({ gameId, ts: Date.now() });
    await StorageManager.set(K_RECENT, recent.slice(0, 30));

    const stats = await this.getStats();
    stats.totalPlays = (stats.totalPlays || 0) + 1;
    stats.perGame = stats.perGame || {};
    stats.perGame[gameId] = (stats.perGame[gameId] || 0) + 1;
    await StorageManager.set(K_STATS, stats);

    if (stats.totalPlays === 1) await AchievementsAPI.unlock("first_game");
    if (stats.totalPlays === 10) await AchievementsAPI.unlock("ten_games");
    if (stats.totalPlays === 100) await AchievementsAPI.unlock("hundred_games");
    if (Object.keys(stats.perGame).length >= 15) await AchievementsAPI.unlock("variety");
  },

  async getStats() { return (await StorageManager.get(K_STATS, null)) || emptyStats(); },

  async resetAll() {
    await StorageManager.set(K_SCORES, {});
    await StorageManager.set(K_FAVORITES, []);
    await StorageManager.set(K_RECENT, []);
    await StorageManager.set(K_STATS, emptyStats());
    await StorageManager.set(K_ACHIEVEMENTS, []);
  }
};

export const AchievementsAPI = {
  DEFS: {
    first_game: { icon: "🎮", title: "Player One", desc: "Play your first game" },
    ten_games: { icon: "🔟", title: "Warming Up", desc: "Play 10 games" },
    hundred_games: { icon: "💯", title: "Arcade Regular", desc: "Play 100 games" },
    new_high_score: { icon: "📈", title: "Personal Best", desc: "Beat one of your own records" },
    first_win: { icon: "🥇", title: "First Victory", desc: "Win a board or puzzle game" },
    ten_wins: { icon: "👑", title: "Champion", desc: "Win 10 games" },
    explorer: { icon: "🧭", title: "Explorer", desc: "Set a score in 10 different games" },
    variety: { icon: "🌈", title: "Variety Pack", desc: "Try 15 different games" }
  },
  async getUnlocked() { return (await StorageManager.get(K_ACHIEVEMENTS, [])) || []; },
  async unlock(id) {
    const list = await this.getUnlocked();
    if (!list.includes(id)) {
      list.push(id);
      await StorageManager.set(K_ACHIEVEMENTS, list);
      window.dispatchEvent(new CustomEvent("ogh:achievement", { detail: { id } }));
    }
  }
};
