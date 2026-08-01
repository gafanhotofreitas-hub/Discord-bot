const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { transfer } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Transfer credits to another user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User who will receive the credits')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Amount of credits to transfer')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const recipient = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    if (recipient.id === interaction.user.id) {
      return interaction.reply({ content: '❌ You can\'t transfer credits to yourself.', flags: MessageFlags.Ephemeral });
    }
    if (recipient.bot) {
      return interaction.reply({ content: '❌ You can\'t transfer credits to a bot.', flags: MessageFlags.Ephemeral });
    }

    const success = transfer(interaction.user.id, recipient.id, amount);

    if (!success) {
      return interaction.reply({ content: '❌ You don\'t have enough credits for that transfer.', flags: MessageFlags.Ephemeral });
    }

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setDescription(`✅ You transferred **${amount} credits** to <@${recipient.id}>.`);

    await interaction.reply({ embeds: [embed] });
  },
};
