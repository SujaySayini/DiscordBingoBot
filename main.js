const { Client, Intents, MessageAttachment } = require('discord.js');
const creds = require('./credentials.json');
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const commands = [{
  name: 'board',
  description: 'Generates a bingo board!'
}]; 

const rest = new REST({ version: '9' }).setToken(creds.token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(creds.application_id, "882126573787037716"),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

client.once('ready', () => {
	console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'board') {
    await interaction.reply('Creating board!');
  }
});



client.login(creds.token);