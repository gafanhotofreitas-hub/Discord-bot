const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, xpForLevel, BADGES } = require('../database');
const { COLORS, progressBar } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your balance or another user\'s balance')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check (optional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const user = getUser(target.id);
    const needed = xpForLevel(user.level);

    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setAuthor({ name: target.username, iconURL: target.displayAvatarURL() })
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '💰 Wallet', value: `${user.balance} credits`, inline: true },
        { name: '🏦 Bank', value: `${user.bank} credits`, inline: true },
        { name: '🔥 Streak', value: `${user.streak} days`, inline: true },
        {
          name: `⭐ Level ${user.level}`,
          value: `${progressBar(user.xp, needed)}  ${user.xp}/${needed} XP`,
        },
        { name: '🏅 Badges', value: `${user.badges.length}/${BADGES.length} unlocked` },
      )
      .setFooter({ text: 'Your bank is safe from /rob · Use /bank deposit to protect your credits' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
