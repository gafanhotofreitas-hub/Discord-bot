const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config', '.env') });

const fs = require('fs');
const { REST, Routes } = require('discord.js');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`🔄 Registering ${commands.length} slash commands...`);

    let data;
    if (process.env.GUILD_ID) {
      // Guild-scoped registration: shows up instantly, great for testing
      data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands },
      );
    } else {
      // Global registration: can take up to 1h to propagate across all servers
      data = await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands },
      );
    }

    console.log(`✅ ${data.length} commands registered successfully.`);
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
})();
