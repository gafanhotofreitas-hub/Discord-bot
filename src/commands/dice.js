const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getUser, addBalance, addXp, recordGameResult, checkAndAwardBadges } = require('../database');
const { COLORS, sleep, appendBadgeUnlocks, appendLevelUp, betXpBonus, safeEdit } = require('../utils');

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const PAYOUT_MULTIPLIER = 5; // exact number guess pays 5x
const WIN_XP = 12;
const LOSE_XP = 3;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Guess the dice roll (1-6) for a 5x payout')
    .addIntegerOption(option =>
      option.setName('bet')
        .setDescription('Amount of credits to bet')
        .setRequired(true)
        .setMinValue(1)
    )
    .addIntegerOption(option =>
      option.setName('guess')
        .setDescription('Your guess (1-6)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(6)
    ),

  async execute(interaction) {
    const bet = interaction.options.getInteger('bet');
    const guess = interaction.options.getInteger('guess');
    const user = getUser(interaction.user.id);

    if (user.balance < bet) {
      return interaction.reply({
        content: `❌ You don't have enough credits! Current balance: **${user.balance}**`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(COLORS.neutral).setTitle('🎲 Dice').setDescription('Rolling... 🎲')],
    });
    await sleep(400);
    await safeEdit(interaction, {
      embeds: [new EmbedBuilder().setColor(COLORS.neutral).setTitle('🎲 Dice').setDescription(`${DICE_FACES[Math.floor(Math.random() * 6)]}`)],
    });
    await sleep(500);

    const roll = Math.floor(Math.random() * 6) + 1;
    const won = roll === guess;
    const prize = won ? bet * PAYOUT_MULTIPLIER : 0;
    const netWin = won ? prize - bet : -bet;
    const totalXp = (won ? WIN_XP : LOSE_XP) + betXpBonus(bet);

    const newBalance = addBalance(interaction.user.id, netWin);
    const xpResult = addXp(interaction.user.id, totalXp);
    recordGameResult(interaction.user.id, won, 'dice', won ? netWin : 0);
    const newBadges = checkAndAwardBadges(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(won ? COLORS.success : COLORS.fail)
      .setTitle('🎲 Dice')
      .setDescription(
        `${DICE_FACES[roll - 1]} The dice landed on **${roll}**! You guessed **${guess}**.\n\n` +
        (won
          ? `✅ You won **${netWin} credits** (5x payout)! · +${totalXp} XP`
          : `❌ You lost **${bet} credits**. · +${totalXp} XP`)
      )
      .setFooter({ text: `Current balance: ${newBalance.balance} credits` });

    appendLevelUp(embed, xpResult);
    appendBadgeUnlocks(embed, newBadges);

    await safeEdit(interaction, { embeds: [embed] }, 2);
  },
};
