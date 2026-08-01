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

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

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
