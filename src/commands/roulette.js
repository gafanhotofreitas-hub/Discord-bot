const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getUser, addBalance, addXp, recordGameResult, checkAndAwardBadges } = require('../database');
const { COLORS, sleep, appendBadgeUnlocks, appendLevelUp, betXpBonus, safeEdit } = require('../utils');

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const COLOR_PAYOUT = 2;
const GREEN_PAYOUT = 14;
const NUMBER_PAYOUT = 35;
const WIN_XP = 14;
const LOSE_XP = 3;

function colorOf(n) {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

function colorEmoji(color) {
  return { red: '🔴', black: '⚫', green: '🟢' }[color];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('Bet on a color or an exact number (0-36)')
    .addIntegerOption(option =>
      option.setName('bet')
        .setDescription('Amount of credits to bet')
        .setRequired(true)
        .setMinValue(1)
    )
    .addStringOption(option =>
      option.setName('color')
        .setDescription('Bet on a color (pays 2x, or 14x for green)')
        .addChoices(
          { name: 'Red', value: 'red' },
          { name: 'Black', value: 'black' },
          { name: 'Green (0)', value: 'green' },
        )
    )
    .addIntegerOption(option =>
      option.setName('number')
        .setDescription('Bet on an exact number 0-36 (pays 35x)')
        .setMinValue(0)
        .setMaxValue(36)
    ),

  async execute(interaction) {
    const bet = interaction.options.getInteger('bet');
    const colorChoice = interaction.options.getString('color');
    const numberChoice = interaction.options.getInteger('number');
    const user = getUser(interaction.user.id);

    if (!colorChoice && numberChoice === null) {
      return interaction.reply({ content: '❌ Choose either a color or a number to bet on.', flags: MessageFlags.Ephemeral });
    }
    if (colorChoice && numberChoice !== null) {
      return interaction.reply({ content: '❌ Choose only one: a color OR a number, not both.', flags: MessageFlags.Ephemeral });
    }
    if (user.balance < bet) {
      return interaction.reply({
        content: `❌ You don't have enough credits! Current balance: **${user.balance}**`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(COLORS.neutral).setTitle('🎡 Roulette').setDescription('Spinning the wheel... 🌀')],
    });
    await sleep(900);

    const result = Math.floor(Math.random() * 37); // 0-36
    const resultColor = colorOf(result);

    let won = false;
    let prize = 0;
    let betDescription;

    if (numberChoice !== null) {
      won = numberChoice === result;
      prize = won ? bet * NUMBER_PAYOUT : 0;
      betDescription = `number **${numberChoice}**`;
    } else {
      won = colorChoice === resultColor;
      prize = won ? bet * (colorChoice === 'green' ? GREEN_PAYOUT : COLOR_PAYOUT) : 0;
      betDescription = `**${colorChoice}**`;
    }

    const delta = won ? prize - bet : -bet;
    const totalXp = (won ? WIN_XP : LOSE_XP) + betXpBonus(bet);

    const newBalance = addBalance(interaction.user.id, delta);
    const xpResult = addXp(interaction.user.id, totalXp);
    recordGameResult(interaction.user.id, won, 'roulette', won ? delta : 0);
    const newBadges = checkAndAwardBadges(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(won ? COLORS.success : COLORS.fail)
      .setTitle('🎡 Roulette')
      .setDescription(
        `The ball landed on ${colorEmoji(resultColor)} **${result} (${resultColor})**!\n` +
        `You bet on ${betDescription}.\n\n` +
        (won
          ? `✅ You won **${delta} credits**! · +${totalXp} XP`
          : `❌ You lost **${bet} credits**. · +${totalXp} XP`)
      )
      .setFooter({ text: `Current balance: ${newBalance.balance} credits` });

    appendLevelUp(embed, xpResult);
    appendBadgeUnlocks(embed, newBadges);

    await safeEdit(interaction, { embeds: [embed] }, 2);
  },
};
