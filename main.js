const { Client, Intents, MessageAttachment } = require('discord.js');
const creds = require('./credentials.json');
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.once('ready', () => {
	console.log('Ready!');
});

client.on('interactionCreate', interaction => {
	if (!interaction.isCommand()) return;

	if (interaction.commandName === 'profile') {
		// ...
	}
});

client.login(creds.token);