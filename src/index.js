const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config', '.env') });

const fs = require('fs');
const { Client, GatewayIntentBits, Collection, MessageFlags } = require('discord.js');

// --- Global safety nets --------------------------------------------------
// These prevent the whole process from crashing/exiting silently because of
// an error in a single command, event handler, or background promise.
// Without these, an unhandled rejection anywhere (e.g. inside a button
// collector) can bring the entire bot down with no error in the logs.
process.on('unhandledRejection', (reason) => {
  console.error('🔥 Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('🔥 Uncaught exception:', error);
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.on('error', (error) => {
  console.error('🔥 Discord client error:', error);
});

client.on('shardError', (error) => {
  console.error('🔥 Websocket connection error:', error);
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

    // Sending the error message itself can fail (e.g. expired interaction) —
    // catch that too so it never bubbles up as an unhandled rejection.
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    } catch (followUpError) {
      console.error('Could not send error message to user:', followUpError);
    }
  }
});

client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error('🔥 Failed to log in — check your DISCORD_TOKEN:', error);
});
