// Shared visual helpers used across commands.

const COLORS = {
  success: 0x2ecc71,
  fail: 0xe74c3c,
  info: 0x3498db,
  gold: 0xf1c40f,
  purple: 0x9b59b6,
  orange: 0xf39c12,
  neutral: 0x2c2f33,
};

// Renders a block-style progress bar, e.g. ▓▓▓▓▓░░░░░ 50%
function progressBar(current, max, size = 12) {
  const safeMax = max <= 0 ? 1 : max;
  const ratio = Math.max(0, Math.min(1, current / safeMax));
  const filled = Math.round(ratio * size);
  return '▓'.repeat(filled) + '░'.repeat(size - filled);
}

// Small helper to pause between animation frames when editing a message
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Appends newly unlocked badges to an embed as an extra field, if any
function appendBadgeUnlocks(embed, newBadges) {
  if (newBadges && newBadges.length > 0) {
    const lines = newBadges.map(b => `${b.emoji} **${b.name}** — ${b.description}`);
    embed.addFields({ name: '🏅 Achievement unlocked!', value: lines.join('\n') });
  }
  return embed;
}

// Appends a level-up field to an embed, if the action caused one
function appendLevelUp(embed, xpResult) {
  if (xpResult && xpResult.leveledUp) {
    embed.addFields({ name: '⬆️ Level up!', value: `You reached **level ${xpResult.newLevel}**!` });
  }
  return embed;
}

module.exports = { COLORS, progressBar, sleep, appendBadgeUnlocks, appendLevelUp };
