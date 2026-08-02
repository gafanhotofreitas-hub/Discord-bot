const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, addBalance, addXp, recordGameResult, checkAndAwardBadges } = require('../database');
const { COLORS, sleep, appendBadgeUnlocks, appendLevelUp, betXpBonus, safeEdit } = require('../utils');

const SYMBOLS = ['🍒', '🍋', '🍇', '🔔', '💎', '7️⃣'];
const SPINNING = '❔';
const WIN_XP = 10;
const LOSE_XP = 3;
// Fewer frames + slightly longer delay reduces the chance of hitting
// Discord's rate limit on rapid successive message edits.
const SPIN_FRAMES_PER_REEL = 3;
const FRAME_DELAY = 400;
const REEL_LOCK_DELAY = 500;

// Multiplier by combination
function calculatePrize(a, b, c, bet) {
  if (a === b && b === c) {
    if (a === '7️⃣') return bet * 10;
    if (a === '💎') return bet * 7;
    return bet * 5;
  }
  if (a === b || b === c || a === c) {
    return bet * 1.5;
  }
  return 0;
}

function randomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function frame(r1, r2, r3) {
  return new EmbedBuilder()
    .setColor(COLORS.neutral)
    .setTitle('🎰 Slots')
    .setDescription(`**[ ${r1} | ${r2} | ${r3} ]**`);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Play the slot machine')
    .addIntegerOption(option =>
      option.setName('bet')
        .setDescription('Amount of credits to bet')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const bet = interaction.options.getInteger('bet');
    const user = getUser(interaction.user.id);

    if (user.balance < bet) {
      return interaction.reply({
        content: `❌ You don't have enough credits! Current balance: **${user.balance}**`,
        ephemeral: true,
      });
    }

    // The outcome is decided up front — the animation just reveals it gradually.
    // This also guarantees the final result is always known even if some
    // animation frames along the way fail to send (see safeEdit below).
    const a = randomSymbol();
    const b = randomSymbol();
    const c = randomSymbol();

    await interaction.reply({ embeds: [frame(SPINNING, SPINNING, SPINNING)] });

    // Reel 1: spins, then locks on its final symbol.
    // Animation frames use safeEdit with 0 retries — if Discord briefly
    // rate-limits an edit, we just skip that one frame instead of crashing
    // the whole command (the final result edit below always retries).
    for (let i = 0; i < SPIN_FRAMES_PER_REEL; i++) {
      await sleep(FRAME_DELAY);
      await safeEdit(interaction, { embeds: [frame(randomSymbol(), SPINNING, SPINNING)] });
    }
    await sleep(REEL_LOCK_DELAY);
    await safeEdit(interaction, { embeds: [frame(a, SPINNING, SPINNING)] });

    // Reel 2
    for (let i = 0; i < SPIN_FRAMES_PER_REEL; i++) {
      await sleep(FRAME_DELAY);
      await safeEdit(interaction, { embeds: [frame(a, randomSymbol(), SPINNING)] });
    }
    await sleep(REEL_LOCK_DELAY);
    await safeEdit(interaction, { embeds: [frame(a, b, SPINNING)] });

    // Reel 3
    for (let i = 0; i < SPIN_FRAMES_PER_REEL; i++) {
      await sleep(FRAME_DELAY);
      await safeEdit(interaction, { embeds: [frame(a, b, randomSymbol())] });
    }
    await sleep(REEL_LOCK_DELAY);
    await safeEdit(interaction, { embeds: [frame(a, b, c)] });
    await sleep(300);

    const prize = Math.floor(calculatePrize(a, b, c, bet));
    const won = prize > 0;
    const netWin = prize - bet;
    const newBalance = addBalance(interaction.user.id, netWin);
    const totalXp = (won ? WIN_XP : LOSE_XP) + betXpBonus(bet);
    const xpResult = addXp(interaction.user.id, totalXp);
    recordGameResult(interaction.user.id, won, 'slots', Math.max(netWin, 0));
    const newBadges = checkAndAwardBadges(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(won ? COLORS.success : COLORS.fail)
      .setTitle('🎰 Slots')
      .setDescription(
        `**[ ${a} | ${b} | ${c} ]**\n\n` +
        (won
          ? `✅ You won **${netWin} credits**! · +${totalXp} XP`
          : `❌ No matching combo. You lost **${bet} credits**. · +${totalXp} XP`)
      )
      .setFooter({ text: `Current balance: ${newBalance.balance} credits` });

    appendLevelUp(embed, xpResult);
    appendBadgeUnlocks(embed, newBadges);

    // This final edit is the one that matters most — retries twice before
    // giving up, so the result should (almost) always get shown even if a
    // transient Discord rate limit caused an earlier frame to be skipped.
    await safeEdit(interaction, { embeds: [embed] }, 2);
  },
};
