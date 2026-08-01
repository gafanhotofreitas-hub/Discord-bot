const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, xpForLevel, BADGES } = require('../database');
const { COLORS, progressBar } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Check your level, XP progress, and stats')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check (optional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const user = getUser(target.id);
    const needed = xpForLevel(user.level);
    const winRate = user.stats.games_played > 0
      ? Math.round((user.stats.wins / user.stats.games_played) * 100)
      : 0;

    const embed = new EmbedBuilder()
      .setColor(COLORS.purple)
      .setAuthor({ name: target.username, iconURL: target.displayAvatarURL() })
      .setThumbnail(target.displayAvatarURL())
      .setTitle(`⭐ Level ${user.level}`)
      .setDescription(`${progressBar(user.xp, needed, 16)}\n${user.xp}/${needed} XP`)
      .addFields(
        { name: '🔥 Current streak', value: `${user.streak} days`, inline: true },
        { name: '🏆 Best streak', value: `${user.best_streak} days`, inline: true },
        { name: '🏅 Badges', value: `${user.badges.length}/${BADGES.length}`, inline: true },
        { name: '🎮 Games played', value: `${user.stats.games_played}`, inline: true },
        { name: '✅ Wins', value: `${user.stats.wins}`, inline: true },
        { name: '📊 Win rate', value: `${winRate}%`, inline: true },
      )
      .setFooter({ text: 'Earn XP from /daily, /work, and every game you play' });

    await interaction.reply({ embeds: [embed] });
  },
};
