const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config', '.env') });

const fs = require('fs');
const { Client, GatewayIntentBits, Collection, MessageFlags } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

// Automatically load all commands from the commands/ folder
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`⚠️  The command in ${file} is missing "data" or "execute".`);
  }
}

client.once('clientReady', () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
  console.log(`📦 ${client.commands.size} commands loaded.`);
});

// --- Anti-spam cooldowns (per user) ------------------------------------
// Game commands get a longer cooldown to prevent spam-clicking for credits.
// Everything else gets a short cooldown just to prevent double-submits.
const GAME_COMMANDS = new Set(['coinflip', 'slots', 'dice', 'roulette', 'blackjack']);
const GAME_COOLDOWN_MS = 5000;
const OTHER_COOLDOWN_MS = 2000;

const lastGameUse = new Map(); // userId -> timestamp
const lastOtherUse = new Map(); // userId -> timestamp

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  const isGameCommand = GAME_COMMANDS.has(interaction.commandName);
  const cooldownMap = isGameCommand ? lastGameUse : lastOtherUse;
  const cooldownMs = isGameCommand ? GAME_COOLDOWN_MS : OTHER_COOLDOWN_MS;

  const now = Date.now();
  const lastUsed = cooldownMap.get(interaction.user.id) || 0;
  const remaining = cooldownMs - (now - lastUsed);

  if (remaining > 0) {
    return interaction.reply({
      content: `⏳ Slow down! Wait **${(remaining / 1000).toFixed(1)}s** before using ${isGameCommand ? 'another game command' : 'a command'} again.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  cooldownMap.set(interaction.user.id, now);

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing /${interaction.commandName}:`, error);
    const errorMessage = { content: '❌ An error occurred while executing this command.', flags: MessageFlags.Ephemeral };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
