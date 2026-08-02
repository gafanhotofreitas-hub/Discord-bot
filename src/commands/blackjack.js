const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { getUser, addBalance, addXp, recordGameResult, checkAndAwardBadges } = require('../database');
const { COLORS, appendBadgeUnlocks, appendLevelUp, betXpBonus, safeEdit } = require('../utils');

const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const WIN_XP = 15;
const LOSE_XP = 3;

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

function cardValue(card, currentTotal) {
  if (card.rank === 'A') return currentTotal + 11 > 21 ? 1 : 11;
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  return parseInt(card.rank, 10);
}

function calculateTotal(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.rank === 'A') aces++;
    total += cardValue(card, total);
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function formatHand(hand) {
  return hand.map(c => `${c.rank}${c.suit}`).join(' ');
}

// Applies balance/xp/badge side effects for a finished round and returns
// the extra embed fields to append.
function settleRound(userId, won, betDelta, bet) {
  const newBalance = addBalance(userId, betDelta);
  const totalXp = (won ? WIN_XP : LOSE_XP) + betXpBonus(bet);
  const xpResult = addXp(userId, totalXp);
  recordGameResult(userId, won, 'blackjack', won ? betDelta : 0);
  const newBadges = checkAndAwardBadges(userId);
  return { newBalance, xpResult, newBadges, totalXp };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('Play a round of blackjack against the house')
    .addIntegerOption(option =>
      option.setName('bet')
        .setDescription('Amount of credits to bet')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const bet = interaction.options.getInteger('bet');
    const user = getUser(interaction.user.id);

    if (user.balance < bet) {
      return interaction.reply({
        content: `❌ You don't have enough credits! Current balance: **${user.balance}**`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const deck = createDeck();
    const playerHand = [deck.pop(), deck.pop()];
    const dealerHand = [deck.pop(), deck.pop()];

    const buildEmbed = (revealDealer, finalStatus = null, color = COLORS.purple) => {
      const playerTotal = calculateTotal(playerHand);
      const dealerTotal = calculateTotal(dealerHand);

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('🃏 Blackjack')
        .addFields(
          { name: `Your hand (${playerTotal})`, value: formatHand(playerHand) },
          {
            name: revealDealer ? `Dealer's hand (${dealerTotal})` : "Dealer's hand",
            value: revealDealer ? formatHand(dealerHand) : `${dealerHand[0].rank}${dealerHand[0].suit} 🂠`,
          },
        );

      if (finalStatus) embed.setDescription(finalStatus);
      return embed;
    };

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('stand').setLabel('Stand').setStyle(ButtonStyle.Secondary),
    );

    const initialTotal = calculateTotal(playerHand);
    if (initialTotal === 21) {
      const win = Math.floor(bet * 1.5);
      const { newBalance, xpResult, newBadges, totalXp } = settleRound(interaction.user.id, true, win, bet);
      const embed = buildEmbed(true, `🎉 Natural blackjack! You won **1.5x** your bet (+${win} credits)! · +${totalXp} XP`, COLORS.success);
      embed.setFooter({ text: `Current balance: ${newBalance.balance} credits` });
      appendLevelUp(embed, xpResult);
      appendBadgeUnlocks(embed, newBadges);
      return interaction.reply({ embeds: [embed] });
    }

    const initialReply = await interaction.reply({
      embeds: [buildEmbed(false)],
      components: [buttons],
      withResponse: true,
    });
    const response = initialReply.resource.message;

    const collector = response.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id,
      time: 30000,
    });

    let finished = false;

    collector.on('collect', async i => {
      try {
        if (i.customId === 'hit') {
          playerHand.push(deck.pop());
          const total = calculateTotal(playerHand);

          if (total > 21) {
            finished = true;
            const { newBalance, xpResult, newBadges, totalXp } = settleRound(interaction.user.id, false, -bet, bet);
            const embed = buildEmbed(true, `💥 You busted with **${total}**! You lost **${bet} credits**. · +${totalXp} XP`, COLORS.fail);
            embed.setFooter({ text: `Current balance: ${newBalance.balance} credits` });
            appendLevelUp(embed, xpResult);
            appendBadgeUnlocks(embed, newBadges);
            await i.update({ embeds: [embed], components: [] });
            collector.stop();
            return;
          }

          await i.update({ embeds: [buildEmbed(false)], components: [buttons] });
        }

        if (i.customId === 'stand') {
          finished = true;
          let dealerTotal = calculateTotal(dealerHand);
          while (dealerTotal < 17) {
            dealerHand.push(deck.pop());
            dealerTotal = calculateTotal(dealerHand);
          }

          const playerTotal = calculateTotal(playerHand);
          let outcome;
          let balanceDelta;
          let won;
          let color;

          if (dealerTotal > 21 || playerTotal > dealerTotal) {
            balanceDelta = bet;
            won = true;
            color = COLORS.success;
          } else if (playerTotal === dealerTotal) {
            outcome = `🤝 Tie at **${playerTotal}**. Your bet was returned.`;
            balanceDelta = 0;
            won = null; // push — no xp/stat change
            color = COLORS.neutral;
          } else {
            balanceDelta = -bet;
            won = false;
            color = COLORS.fail;
          }

          let xpResult = null;
          let newBadges = [];
          let newBalance;

          if (won === null) {
            newBalance = addBalance(interaction.user.id, balanceDelta);
          } else {
            const settled = settleRound(interaction.user.id, won, balanceDelta, bet);
            newBalance = settled.newBalance;
            xpResult = settled.xpResult;
            newBadges = settled.newBadges;
            outcome = won
              ? `🎉 You won with **${playerTotal}** against **${dealerTotal}**! +${bet} credits · +${settled.totalXp} XP`
              : `❌ You lost with **${playerTotal}** against **${dealerTotal}**. -${bet} credits · +${settled.totalXp} XP`;
          }

          const embed = buildEmbed(true, outcome, color);
          embed.setFooter({ text: `Current balance: ${newBalance.balance} credits` });
          appendLevelUp(embed, xpResult);
          appendBadgeUnlocks(embed, newBadges);
          await i.update({ embeds: [embed], components: [] });
          collector.stop();
        }
      } catch (error) {
        console.error('Error in blackjack button handler:', error);
        finished = true;
        collector.stop();
        await interaction.editReply({ components: [] }).catch(() => {});
      }
    });

    collector.on('end', async () => {
      if (!finished) {
        await interaction.editReply({ components: [] }).catch(() => {});
      }
    });
  },
};
