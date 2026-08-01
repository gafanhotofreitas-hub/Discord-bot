const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, BADGES } = require('../database');
const { COLORS } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievements')
    .setDescription('View your unlocked and locked badges')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check (optional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const user = getUser(target.id);

    const lines = BADGES.map(badge => {
      const unlocked = user.badges.includes(badge.id);
      const icon = unlocked ? badge.emoji : '🔒';
      const name = unlocked ? `**${badge.name}**` : `~~${badge.name}~~`;
      return `${icon} ${name} — ${badge.description}`;
    });

    const embed = new EmbedBuilder()
      .setColor(COLORS.orange)
      .setAuthor({ name: target.username, iconURL: target.displayAvatarURL() })
      .setTitle(`🏅 Achievements (${user.badges.length}/${BADGES.length})`)
      .setDescription(lines.join('\n'));

    await interaction.reply({ embeds: [embed] });
  },
};
