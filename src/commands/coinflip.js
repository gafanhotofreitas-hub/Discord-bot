const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getUser, addBalance, addXp, recordGameResult, checkAndAwardBadges } = require('../database');
const { COLORS, sleep, appendBadgeUnlocks, appendLevelUp, betXpBonus, safeEdit } = require('../utils');

const WIN_XP = 10;
const LOSE_XP = 3;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Bet your credits on a coin flip')
    .addIntegerOption(option =>
      option.setName('bet')
        .setDescription('Amount of credits to bet')
        .setRequired(true)
        .setMinValue(1)
    )
    .addStringOption(option =>
      option.setName('choice')
        .setDescription('Heads or tails')
        .setRequired(true)
        .addChoices(
          { name: 'Heads', value: 'heads' },
          { name: 'Tails', value: 'tails' },
        )
    ),

  async execute(interaction) {
    const bet = interaction.options.getInteger('bet');
    const choice = interaction.options.getString('choice');
    const user = getUser(interaction.user.id);

    if (user.balance < bet) {
      return interaction.reply({
        content: `❌ You don't have enough credits! Current balance: **${user.balance}**`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(COLORS.neutral).setTitle('🪙 Coinflip').setDescription('Flipping the coin... 🌀')],
    });
    await sleep(900);

    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = result === choice;
    const newBalance = addBalance(interaction.user.id, won ? bet : -bet);
    const totalXp = (won ? WIN_XP : LOSE_XP) + betXpBonus(bet);
    const xpResult = addXp(interaction.user.id, totalXp);
    recordGameResult(interaction.user.id, won, 'coinflip', bet);
    const newBadges = checkAndAwardBadges(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(won ? COLORS.success : COLORS.fail)
      .setTitle('🪙 Coinflip')
      .setDescription(
        `The coin landed on **${result}**!\n\n` +
        (won
          ? `✅ You won **${bet} credits**! · +${totalXp} XP`
          : `❌ You lost **${bet} credits**. · +${totalXp} XP`)
      )
      .setFooter({ text: `Current balance: ${newBalance.balance} credits` });

    appendLevelUp(embed, xpResult);
    appendBadgeUnlocks(embed, newBadges);

    await safeEdit(interaction, { embeds: [embed] }, 2);
  },
};
