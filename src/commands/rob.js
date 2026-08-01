const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getUser, getRobCooldownRemaining, attemptRob, addXp, checkAndAwardBadges } = require('../database');
const { COLORS, appendBadgeUnlocks, appendLevelUp } = require('../utils');

const SUCCESS_XP = 10;
const CAUGHT_XP = 3;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Attempt to steal 5-20% of another user\'s wallet (their bank is safe)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to rob')
        .setRequired(true)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const now = Date.now();

    if (target.id === interaction.user.id) {
      return interaction.reply({ content: '❌ You can\'t rob yourself.', flags: MessageFlags.Ephemeral });
    }
    if (target.bot) {
      return interaction.reply({ content: '❌ You can\'t rob a bot.', flags: MessageFlags.Ephemeral });
    }

    const remaining = getRobCooldownRemaining(interaction.user.id, now);
    if (remaining > 0) {
      const minutes = Math.ceil(remaining / (1000 * 60));
      return interaction.reply({
        content: `⏳ You're laying low. Try robbing again in **${minutes} min**.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const targetUser = getUser(target.id);
    if (targetUser.balance <= 0) {
      return interaction.reply({
        content: `💨 <@${target.id}>'s wallet is empty — nothing to steal. Their bank credits are safe from robbery.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const result = attemptRob(interaction.user.id, target.id, now);
    const won = result.outcome === 'success';
    const xpResult = addXp(interaction.user.id, won ? SUCCESS_XP : CAUGHT_XP);
    const newBadges = checkAndAwardBadges(interaction.user.id);

    const embed = new EmbedBuilder().setColor(won ? COLORS.success : COLORS.fail).setTitle('🦹 Robbery');

    if (won) {
      embed.setDescription(
        `✅ You snuck up on <@${target.id}> and stole **${result.amount} credits** (${Math.round(result.percent * 100)}% of their wallet)! · +${SUCCESS_XP} XP`
      );
    } else {
      embed.setDescription(
        `🚨 You got caught trying to rob <@${target.id}>! You paid a fine of **${result.amount} credits** to them instead. · +${CAUGHT_XP} XP`
      );
    }

    embed.setFooter({ text: 'Tip: keep credits in your bank with /bank deposit to protect them from robbery.' });
    appendLevelUp(embed, xpResult);
    appendBadgeUnlocks(embed, newBadges);

    await interaction.reply({ embeds: [embed] });
  },
};
