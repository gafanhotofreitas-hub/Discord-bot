const fs = require('fs');
const path = require('path');
const BADGES = require('./badges');

const DB_PATH = path.join(__dirname, '..', 'economy.json');

// In-memory structure: { userId: { balance, bank, last_daily, last_work, xp, level, streak, best_streak, badges, stats } }
let data = {};

// Writing to disk synchronously on every single mutation (a typical command
// like /work triggers 3-4 separate saves: balance, cooldown, XP, badges)
// blocks Node's event loop repeatedly during command handling. On a slower
// disk or under load, this can add up to enough delay that Discord discards
// the interaction (error 10062 "Unknown interaction", which requires a
// response within ~3 seconds). Debouncing coalesces rapid successive saves
// into a single write shortly after, keeping command handling fast.
const SAVE_DEBOUNCE_MS = 250;
let saveTimeout = null;

function writeToDisk() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('🔥 Failed to save economy.json:', error);
  }
}

function save() {
  if (saveTimeout) return; // a write is already scheduled — this call rides along with it
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    writeToDisk();
  }, SAVE_DEBOUNCE_MS);
}

// Forces any pending debounced save to happen immediately. Used on process
// shutdown (SIGINT/SIGTERM from PM2, Ctrl+C, etc.) so a restart never loses
// the last few seconds of changes.
function flushSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  writeToDisk();
}

function load() {
  if (fs.existsSync(DB_PATH)) {
    try {
      data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (err) {
      console.error('Error reading economy.json, starting fresh:', err);
      data = {};
    }
  } else {
    flushSave();
  }
}

function defaultUser(userId) {
  return {
    user_id: userId,
    balance: 0,
    bank: 0,
    last_daily: 0,
    last_work: 0,
    last_rob: 0,
    xp: 0,
    level: 1,
    streak: 0,
    best_streak: 0,
    badges: [],
    stats: { wins: 0, losses: 0, games_played: 0, blackjack_wins: 0, biggest_win: 0, robs_success: 0 },
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
    .sort((a, b) => (b.balance + b.bank) - (a.balance + a.bank))
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

// --- Bank (safe zone, immune to robbery) ---------------------------------

function deposit(userId, amount) {
  ensureUser(userId);
  const user = data[userId];
  if (amount > user.balance) return null;

  user.balance -= amount;
  user.bank += amount;
  save();
  return user;
}

function withdraw(userId, amount) {
  ensureUser(userId);
  const user = data[userId];
  if (amount > user.bank) return null;

  user.bank -= amount;
  user.balance += amount;
  save();
  return user;
}

// --- Robbery ---------------------------------------------------------------

const ROB_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const ROB_MIN_PERCENT = 0.05;
const ROB_MAX_PERCENT = 0.20;
const ROB_SUCCESS_CHANCE = 0.75;

function getRobCooldownRemaining(userId, now) {
  ensureUser(userId);
  const remaining = ROB_COOLDOWN_MS - (now - data[userId].last_rob);
  return remaining > 0 ? remaining : 0;
}

// Attempts a robbery. Only the wallet (balance) is at risk — the bank is a
// safe zone. Returns a result object describing what happened.
function attemptRob(robberId, targetId, now) {
  ensureUser(robberId);
  ensureUser(targetId);

  data[robberId].last_rob = now;

  const target = data[targetId];
  if (target.balance <= 0) {
    save();
    return { outcome: 'empty' };
  }

  const success = Math.random() < ROB_SUCCESS_CHANCE;
  const percent = ROB_MIN_PERCENT + Math.random() * (ROB_MAX_PERCENT - ROB_MIN_PERCENT);
  const amount = Math.max(1, Math.floor(target.balance * percent));

  if (success) {
    target.balance -= amount;
    data[robberId].balance += amount;
    data[robberId].stats.robs_success += 1;
    save();
    return { outcome: 'success', amount, percent };
  }

  // Failed robbery: the robber gets caught and pays a fine to the target instead
  const fine = Math.min(data[robberId].balance, amount);
  data[robberId].balance -= fine;
  target.balance += fine;
  save();
  return { outcome: 'caught', amount: fine, percent };
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
  deposit,
  withdraw,
  getRobCooldownRemaining,
  attemptRob,
  xpForLevel,
  addXp,
  updateDailyStreak,
  recordGameResult,
  checkAndAwardBadges,
  flushSave,
  BADGES,
};
