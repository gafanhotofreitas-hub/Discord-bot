const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');
const { COLORS } = require('../utils');

const CATEGORIES = {
  economy: {
    label: '💰 Economy',
    description: 'Earning and managing credits',
    embed: new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle('💰 Economy Commands')
      .setDescription(
        '`/balance [user]` — Check your wallet & bank\n' +
        '`/daily` — Claim your daily reward (streak bonus!)\n' +
        '`/work` — Earn 50–200 credits (1h cooldown)\n' +
        '`/pay` — Transfer credits to another user'
      ),
  },
  games: {
    label: '🎮 Games',
    description: 'Bet your credits and try your luck',
    embed: new EmbedBuilder()
      .setColor(COLORS.purple)
      .setTitle('🎮 Games')
      .setDescription(
        '`/coinflip` — 50/50 heads or tails\n' +
        '`/slots` — Match symbols for up to 10x\n' +
        '`/dice` — Guess the roll for a 5x payout\n' +
        '`/roulette` — Bet on a color or exact number\n' +
        '`/blackjack` — Play against the house with hit/stand buttons'
      ),
  },
  progress: {
    label: '⭐ Progress',
    description: 'Levels, streaks, and achievements',
    embed: new EmbedBuilder()
      .setColor(COLORS.gold)
      .setTitle('⭐ Progress & Achievements')
      .setDescription(
        '`/level [user]` — XP progress, streak, and stats\n' +
        '`/achievements [user]` — Your unlocked badges\n' +
        '`/leaderboard` — Top 10 richest users\n\n' +
        'You earn XP from `/daily`, `/work`, and every game — level up and unlock badges as you go!'
      ),
  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Browse all bot commands by category'),

  async execute(interaction) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId('help-menu')
      .setPlaceholder('Choose a category...')
      .addOptions(
        Object.entries(CATEGORIES).map(([key, cat]) => ({
          label: cat.label,
          description: cat.description,
          value: key,
        }))
      );

    const row = new ActionRowBuilder().addComponents(menu);

    const introEmbed = new EmbedBuilder()
      .setColor(COLORS.neutral)
      .setTitle('📖 Bot Help')
      .setDescription('Pick a category below to see the commands in it.');

    const initialReply = await interaction.reply({
      embeds: [introEmbed],
      components: [row],
      withResponse: true,
    });
    const response = initialReply.resource.message;

    const collector = response.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id,
      time: 60000,
    });

    collector.on('collect', async i => {
      const category = CATEGORIES[i.values[0]];
      await i.update({ embeds: [category.embed], components: [row] });
    });

    collector.on('end', async () => {
      await interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};
