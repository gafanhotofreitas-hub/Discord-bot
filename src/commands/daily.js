const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getUser, addBalance, setLastDaily, addXp, updateDailyStreak, checkAndAwardBadges } = require('../database');
const { COLORS, appendBadgeUnlocks, appendLevelUp } = require('../utils');

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const BASE_REWARD = 250;
const STREAK_BONUS_PER_DAY = 15; // extra credits per consecutive day, capped
const MAX_STREAK_BONUS_DAYS = 20;
const DAILY_XP = 20;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily reward'),

  async execute(interaction) {
    const user = getUser(interaction.user.id);
    const now = Date.now();
    const remaining = COOLDOWN_MS - (now - user.last_daily);

    if (remaining > 0) {
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      return interaction.reply({
        content: `⏳ You already claimed today! Come back in **${hours}h ${minutes}m**. Current streak: 🔥 ${user.streak} days.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const streak = updateDailyStreak(interaction.user.id, now);
    const bonus = Math.min(streak, MAX_STREAK_BONUS_DAYS) * STREAK_BONUS_PER_DAY;
    const total = BASE_REWARD + bonus;

    addBalance(interaction.user.id, total);
    setLastDaily(interaction.user.id, now);
    const xpResult = addXp(interaction.user.id, DAILY_XP);
    const newBadges = checkAndAwardBadges(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(COLORS.gold)
      .setTitle('🎁 Daily reward claimed!')
      .setDescription(
        `Base reward: **${BASE_REWARD} credits**\n` +
        `Streak bonus (🔥 ${streak} days): **+${bonus} credits**\n` +
        `**Total: ${total} credits** · +${DAILY_XP} XP`
      )
      .setFooter({ text: `Keep your streak going — miss a day and it resets!` });

    appendLevelUp(embed, xpResult);
    appendBadgeUnlocks(embed, newBadges);

    await interaction.reply({ embeds: [embed] });
  },
};
