const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, addBalance, addXp, recordGameResult, checkAndAwardBadges } = require('../database');
const { COLORS, sleep, appendBadgeUnlocks, appendLevelUp } = require('../utils');

const SYMBOLS = ['🍒', '🍋', '🍇', '🔔', '💎', '7️⃣'];
const SPINNING = '❔';
const WIN_XP = 10;
const LOSE_XP = 3;
const SPIN_FRAMES_PER_REEL = 4;
const FRAME_DELAY = 300;
const REEL_LOCK_DELAY = 450;

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

    // The outcome is decided up front — the animation just reveals it gradually
    const a = randomSymbol();
    const b = randomSymbol();
    const c = randomSymbol();

    await interaction.reply({ embeds: [frame(SPINNING, SPINNING, SPINNING)] });

    // Reel 1: spins, then locks on its final symbol
    for (let i = 0; i < SPIN_FRAMES_PER_REEL; i++) {
      await sleep(FRAME_DELAY);
      await interaction.editReply({ embeds: [frame(randomSymbol(), SPINNING, SPINNING)] });
    }
    await sleep(REEL_LOCK_DELAY);
    await interaction.editReply({ embeds: [frame(a, SPINNING, SPINNING)] });

    // Reel 2: spins, then locks
    for (let i = 0; i < SPIN_FRAMES_PER_REEL; i++) {
      await sleep(FRAME_DELAY);
      await interaction.editReply({ embeds: [frame(a, randomSymbol(), SPINNING)] });
    }
    await sleep(REEL_LOCK_DELAY);
    await interaction.editReply({ embeds: [frame(a, b, SPINNING)] });

    // Reel 3: spins, then locks
    for (let i = 0; i < SPIN_FRAMES_PER_REEL; i++) {
      await sleep(FRAME_DELAY);
      await interaction.editReply({ embeds: [frame(a, b, randomSymbol())] });
    }
    await sleep(REEL_LOCK_DELAY);
    await interaction.editReply({ embeds: [frame(a, b, c)] });
    await sleep(300);

    const prize = Math.floor(calculatePrize(a, b, c, bet));
    const won = prize > 0;
    const result = prize - bet; // net balance change for this spin
    const newBalance = addBalance(interaction.user.id, result);
    const xpResult = addXp(interaction.user.id, won ? WIN_XP : LOSE_XP);
    recordGameResult(interaction.user.id, won, 'slots', prize);
    const newBadges = checkAndAwardBadges(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(won ? COLORS.success : COLORS.fail)
      .setTitle('🎰 Slots')
      .setDescription(
        `**[ ${a} | ${b} | ${c} ]**\n\n` +
        (won
          ? `✅ You won **${prize} credits**! · +${WIN_XP} XP`
          : `❌ No matching combo. You lost **${bet} credits**. · +${LOSE_XP} XP`)
      )
      .setFooter({ text: `Current balance: ${newBalance.balance} credits` });

    appendLevelUp(embed, xpResult);
    appendBadgeUnlocks(embed, newBadges);

    await interaction.editReply({ embeds: [embed] });
  },
};
