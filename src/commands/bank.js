const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getUser, deposit, withdraw } = require('../database');
const { COLORS } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bank')
    .setDescription('Move credits between your wallet and your bank (a safe zone from robberies)')
    .addSubcommand(sub =>
      sub.setName('deposit')
        .setDescription('Move credits from your wallet into your bank')
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('Amount to deposit (omit to deposit everything)')
            .setMinValue(1)
        )
    )
    .addSubcommand(sub =>
      sub.setName('withdraw')
        .setDescription('Move credits from your bank into your wallet')
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('Amount to withdraw (omit to withdraw everything)')
            .setMinValue(1)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const user = getUser(interaction.user.id);

    if (sub === 'deposit') {
      const requested = interaction.options.getInteger('amount') ?? user.balance;

      if (requested <= 0 || user.balance <= 0) {
        return interaction.reply({ content: '❌ You have no credits in your wallet to deposit.', flags: MessageFlags.Ephemeral });
      }
      if (requested > user.balance) {
        return interaction.reply({
          content: `❌ You only have **${user.balance}** credits in your wallet.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const updated = deposit(interaction.user.id, requested);
      const embed = new EmbedBuilder()
        .setColor(COLORS.success)
        .setDescription(`🏦 Deposited **${requested} credits** into your bank.`)
        .addFields(
          { name: '💰 Wallet', value: `${updated.balance} credits`, inline: true },
          { name: '🏦 Bank', value: `${updated.bank} credits`, inline: true },
        );

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'withdraw') {
      const requested = interaction.options.getInteger('amount') ?? user.bank;

      if (requested <= 0 || user.bank <= 0) {
        return interaction.reply({ content: '❌ You have no credits in your bank to withdraw.', flags: MessageFlags.Ephemeral });
      }
      if (requested > user.bank) {
        return interaction.reply({
          content: `❌ You only have **${user.bank}** credits in your bank.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const updated = withdraw(interaction.user.id, requested);
      const embed = new EmbedBuilder()
        .setColor(COLORS.info)
        .setDescription(`💸 Withdrew **${requested} credits** from your bank.`)
        .addFields(
          { name: '💰 Wallet', value: `${updated.balance} credits`, inline: true },
          { name: '🏦 Bank', value: `${updated.bank} credits`, inline: true },
        );

      return interaction.reply({ embeds: [embed] });
    }
  },
};
