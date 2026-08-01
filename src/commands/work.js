const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { addBalance, getUser, setLastWork, addXp, checkAndAwardBadges } = require('../database');
const { COLORS, appendBadgeUnlocks, appendLevelUp } = require('../utils');

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const MIN_EARN = 50;
const MAX_EARN = 200;
const WORK_XP = 15;

const JOBS = [
  'You delivered pizzas around town',
  'You built a website for a client',
  'You tutored someone in math',
  'You helped a friend move house',
  'You streamed and received donations',
  'You sold handmade crafts at a market',
  'You walked dogs around the neighborhood',
  'You fixed a stranger\'s computer',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Work to earn credits'),

  async execute(interaction) {
    const user = getUser(interaction.user.id);
    const now = Date.now();
    const remaining = COOLDOWN_MS - (now - user.last_work);

    if (remaining > 0) {
      const minutes = Math.ceil(remaining / (1000 * 60));
      return interaction.reply({
        content: `⏳ You already worked recently! Try again in **${minutes} min**.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const earned = Math.floor(Math.random() * (MAX_EARN - MIN_EARN + 1)) + MIN_EARN;
    const job = JOBS[Math.floor(Math.random() * JOBS.length)];

    addBalance(interaction.user.id, earned);
    setLastWork(interaction.user.id, now);
    const xpResult = addXp(interaction.user.id, WORK_XP);
    const newBadges = checkAndAwardBadges(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setDescription(`💼 ${job} and earned **${earned} credits**! · +${WORK_XP} XP`);

    appendLevelUp(embed, xpResult);
    appendBadgeUnlocks(embed, newBadges);

    await interaction.reply({ embeds: [embed] });
  },
};
