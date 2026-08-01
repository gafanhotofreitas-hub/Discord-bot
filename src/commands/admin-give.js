const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { addBalance } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-give')
    .setDescription('[Admin] Give credits to a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User who will receive the credits')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Amount of credits to give (can be negative to remove)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    const newBalance = addBalance(target.id, amount);

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setDescription(
        `✅ ${amount >= 0 ? 'Added' : 'Removed'} **${Math.abs(amount)} credits** ${amount >= 0 ? 'to' : 'from'} <@${target.id}>.\n` +
        `New balance: **${newBalance.balance} credits**`
      );

    await interaction.reply({ embeds: [embed] });
  },
};
