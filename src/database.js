const fs = require('fs');
const path = require('path');
const BADGES = require('./badges');

const DB_PATH = path.join(__dirname, '..', 'economy.json');

// In-memory structure: { userId: { balance, bank, last_daily, last_work, xp, level, streak, best_streak, badges, stats } }
let data = {};

function load() {
  if (fs.existsSync(DB_PATH)) {
    try {
      data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (err) {
      console.error('Error reading economy.json, starting fresh:', err);
      data = {};
    }
  } else {
    save();
  }
}

// Simple synchronous write — good enough for a single server bot's volume
function save() {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function defaultUser(userId) {
  return {
    user_id: userId,
    balance: 0,
    bank: 0,
    last_daily: 0,
    last_work: 0,
    xp: 0,
    level: 1,
    streak: 0,
    best_streak: 0,
    badges: [],
    stats: { wins: 0, losses: 0, games_played: 0, blackjack_wins: 0, biggest_win: 0 },
  };
}

load();

// Creates the user if missing, and migrates older records (created before
// the leveling/badges update) so they get the new fields without losing
// their existing balance.
function ensureUser(userId) {
  if (!data[userId]) {
    data[userId] = defaultUser(userId);
    save();
    return;
  }

  const defaults = defaultUser(userId);
  let changed = false;

  for (const key of Object.keys(defaults)) {
    if (key === 'stats') continue;
    if (!(key in data[userId])) {
      data[userId][key] = defaults[key];
      changed = true;
    }
  }

  if (!data[userId].stats) {
    data[userId].stats = defaults.stats;
    changed = true;
  } else {
    for (const key of Object.keys(defaults.stats)) {
      if (!(key in data[userId].stats)) {
        data[userId].stats[key] = 0;
        changed = true;
      }
    }
  }

  if (changed) save();
}

function getUser(userId) {
  ensureUser(userId);
  return data[userId];
}

function addBalance(userId, amount) {
  ensureUser(userId);
  data[userId].balance += amount;
  save();
  return data[userId];
}

function setBalance(userId, amount) {
  ensureUser(userId);
  data[userId].balance = amount;
  save();
  return data[userId];
}

function setLastDaily(userId, timestamp) {
  ensureUser(userId);
  data[userId].last_daily = timestamp;
  save();
}

function setLastWork(userId, timestamp) {
  ensureUser(userId);
  data[userId].last_work = timestamp;
  save();
}

function getLeaderboard(limit = 10) {
  return Object.values(data)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, limit);
}

// Transfer credits between two users
function transfer(fromId, toId, amount) {
  ensureUser(fromId);
  ensureUser(toId);
  if (data[fromId].balance < amount) return false;

  data[fromId].balance -= amount;
  data[toId].balance += amount;
  save();
  return true;
}

// --- Leveling system ---------------------------------------------------

function xpForLevel(level) {
  return level * 100;
}

function addXp(userId, amount) {
  ensureUser(userId);
  const user = data[userId];
  const oldLevel = user.level;

  user.xp += amount;
  let leveledUp = false;
  while (user.xp >= xpForLevel(user.level)) {
    user.xp -= xpForLevel(user.level);
    user.level += 1;
    leveledUp = true;
  }

  save();
  return { user, leveledUp, oldLevel, newLevel: user.level };
}

// --- Streaks -------------------------------------------------------------

function updateDailyStreak(userId, now) {
  ensureUser(userId);
  const user = data[userId];
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const gap = now - user.last_daily;

  if (user.last_daily !== 0 && gap <= ONE_DAY * 2) {
    user.streak += 1;
  } else {
    user.streak = 1;
  }

  if (user.streak > user.best_streak) user.best_streak = user.streak;
  save();
  return user.streak;
}

// --- Game stats ------------------------------------------------------------

function recordGameResult(userId, won, gameType, winAmount = 0) {
  ensureUser(userId);
  const user = data[userId];
  user.stats.games_played += 1;
  if (won) {
    user.stats.wins += 1;
    if (winAmount > user.stats.biggest_win) user.stats.biggest_win = winAmount;
  } else {
    user.stats.losses += 1;
  }
  if (gameType === 'blackjack' && won) user.stats.blackjack_wins += 1;
  save();
}

// --- Badges / achievements --------------------------------------------------

function checkAndAwardBadges(userId) {
  ensureUser(userId);
  const user = data[userId];
  const newlyAwarded = [];

  for (const badge of BADGES) {
    if (!user.badges.includes(badge.id) && badge.check(user)) {
      user.badges.push(badge.id);
      newlyAwarded.push(badge);
    }
  }

  if (newlyAwarded.length > 0) save();
  return newlyAwarded;
}

module.exports = {
  getUser,
  addBalance,
  setBalance,
  setLastDaily,
  setLastWork,
  getLeaderboard,
  transfer,
  xpForLevel,
  addXp,
  updateDailyStreak,
  recordGameResult,
  checkAndAwardBadges,
  BADGES,
};
