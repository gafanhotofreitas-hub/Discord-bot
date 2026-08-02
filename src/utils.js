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

// Extra XP based on how much was risked in a bet. Grows with the bet size
// but with diminishing returns (bet^0.85 instead of linear), and is capped
// so huge bets can't be farmed for huge XP. Roughly: bet 100 → ~10 XP,
// bet 1,000 → ~70 XP, capped at 150 XP no matter how large the bet gets.
function betXpBonus(bet, { scale = 0.2, exponent = 0.85, maxBonus = 150 } = {}) {
  if (!bet || bet <= 0) return 0;
  const bonus = Math.floor(scale * Math.pow(bet, exponent));
  return Math.min(bonus, maxBonus);
}

// Retries an interaction.editReply a couple of times before giving up.
// Discord occasionally rate-limits rapid successive edits (e.g. during a
// slots animation) — without this, a single failed edit could silently
// leave the final result unshown. Animation frames use 0 retries (fine to
// skip a frame); the final result edit should use retries so it (almost)
// always gets through.
async function safeEdit(interaction, payload, retries = 0) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await interaction.editReply(payload);
      return true;
    } catch (error) {
      if (attempt === retries) {
        console.error('Failed to edit interaction reply:', error);
        return false;
      }
      await sleep(350);
    }
  }
  return false;
}

// For button/component interactions (like blackjack's hit/stand buttons):
// acknowledges the click immediately with deferUpdate (very reliable), then
// edits the original interaction's reply through the more robust webhook
// edit path (same mechanism as safeEdit) instead of relying on i.update()
// directly, which has occasionally failed to display final results.
// If everything fails, falls back to posting a brand new followUp message
// so the result is never silently lost.
async function safeComponentUpdate(componentInteraction, originalInteraction, payload, retries = 2) {
  try {
    await componentInteraction.deferUpdate();
  } catch (error) {
    console.error('Failed to defer component update:', error);
  }

  const success = await safeEdit(originalInteraction, payload, retries);
  if (!success) {
    try {
      await originalInteraction.followUp(payload);
      return true;
    } catch (error) {
      console.error('Failed to post fallback followUp message:', error);
      return false;
    }
  }
  return true;
}

module.exports = { COLORS, progressBar, sleep, appendBadgeUnlocks, appendLevelUp, betXpBonus, safeEdit, safeComponentUpdate };
