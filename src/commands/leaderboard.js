const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLeaderboard } = require('../database');
const { COLORS } = require('../utils');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Shows the users with the most credits'),

  async execute(interaction) {
    const top = getLeaderboard(10);

    if (top.length === 0) {
      return interaction.reply('Not enough data yet for a leaderboard.');
    }

    const lines = top.map((u, i) => {
      const position = MEDALS[i] || `\`#${i + 1}\``;
      const total = u.balance + u.bank;
      return `${position} <@${u.user_id}> — **${total}** credits total (💰${u.balance} + 🏦${u.bank}) · ⭐ Lv.${u.level}`;
    });

    const embed = new EmbedBuilder()
      .setColor(COLORS.orange)
      .setTitle('🏆 Credits Leaderboard')
      .setDescription(lines.join('\n'))
      .setFooter({ text: 'Climb the ranks with /work, /daily, and the games!' });

    await interaction.reply({ embeds: [embed] });
  },
};
