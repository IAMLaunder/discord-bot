// index.js
const dotenv = require('dotenv');
dotenv.config();
const fs = require('fs');
const Discord = require('discord.js');
const Sequelize = require('sequelize');
const { prefix, token } = require('./config.json');
const client = new Discord.Client();
client.commands = new Discord.Collection();
client.cooldowns = new Discord.Collection();
const PREFIX = '$';

// client.user.setActivity('use !help for commands');
// to go through folder heirarchy
const commandFolders = fs.readdirSync('./commands');
for (const folder of commandFolders) {
	const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const command = require(`./commands/${folder}/${file}`);
		client.commands.set(command.name, command);
	}
}
// [alpha]
const sequelize = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: true,
	// SQLite only
	storage: 'database.sqlite',
});

// [beta]
/*
 * equivalent to: CREATE TABLE tags(
 * name VARCHAR(255),
 * description TEXT,
 * username VARCHAR(255),
 * usage_count  INT NOT NULL DEFAULT 0
 * );
 */
const Tags = sequelize.define('tags', {
	name: {
		type: Sequelize.STRING,
		unique: true,
	},
	description: Sequelize.TEXT,
	win: Sequelize.INTEGER,
	loss: Sequelize.INTEGER,
	ACS: Sequelize.INTEGER,
	kills: Sequelize.INTEGER,
	deaths: Sequelize.INTEGER,
	assists: Sequelize.INTEGER,
	username: Sequelize.STRING,
	usage_count: {
		type: Sequelize.INTEGER,
		defaultValue: 0,
		allowNull: false,
	},
});

client.once('ready', () => {
	console.log('Ready!');
	// [gamma]
	Tags.sync();
});
// sql setup
client.on('message', async message => {
	if (message.content.startsWith(PREFIX)) {
		const input = message.content.slice(PREFIX.length).trim().split(' ');
		const command = input.shift();
		const commandArgs = input.join(' ');

		if (command === 'addtag') {
			// [delta]
			const splitArgs = commandArgs.split(' ');
			const tagName = splitArgs.shift();
			const tagDescription = splitArgs.shift();
			const tagWin = splitArgs.shift();
			const tagLoss = splitArgs.shift();
			const tagACS = splitArgs.shift();
			const tagKills = splitArgs.shift();
			const tagDeaths = splitArgs.shift();
			const tagAssists = splitArgs.shift();

			try {
				// equivalent to: INSERT INTO tags (name, description, username) values (?, ?, ?);
				const tag = await Tags.create({
					name: tagName,
					description: tagDescription,
					win: tagWin,
					loss: tagLoss,
					ACS: tagACS,
					kills: tagKills,
					deaths: tagDeaths,
					assists: tagAssists,
					username: message.author.username,
				});
				return message.reply(`Tag ${tag.name} added.`);
			}
			catch (e) {
				if (e.name === 'SequelizeUniqueConstraintError') {
					return message.reply('That tag already exists.');
				}
				// return message.reply(tagWin);
				return message.reply('Something went wrong with adding a tag.');
			}
		}
		else if (command === 'tag') {
			// [epsilon]
			const tagName = commandArgs;

			// equivalent to: SELECT * FROM tags WHERE name = 'tagName' LIMIT 1;
			const tag = await Tags.findOne({ where: { name: tagName } });
			if (tag) {
				// equivalent to: UPDATE tags SET usage_count = usage_count + 1 WHERE name = 'tagName';
				tag.increment('usage_count');
				/* const tagDesc = tag.get('description');
				const tagWin = tag.get('tagWin');
				const tagLoss = tag.get('tagLoss');
				const tagACS = tag.get('tagACS');
				const tagKills = tag.get('tagKills');
				const tagDeaths = tag.get('tagDeaths');
				const tagAssists = tag.get('tagAssists');*/
				//const tag = await Tags.findOne({ where: { name: tagName } });
				return message.channel.send(`Description: ${tag.description} \n Wins: ${tag.win} \n Losses: ${tag.loss} \n ACS: ${tag.ACS} \n Kills: ${tag.kills} \n Deaths: ${tag.deaths} \n Assists: ${tag.assists}`);
			}
			return message.reply(`Could not find tag: ${tagName}`);
		}
		else if (command === 'edittag') {
			// [zeta]
			const splitArgs = commandArgs.split(' ');
			const tagName = splitArgs.shift();
			const tagDescription = splitArgs.join(' ');

			// equivalent to: UPDATE tags (description) values (?) WHERE name='?';
			const affectedRows = await Tags.update({ description: tagDescription }, { where: { name: tagName } });
			if (affectedRows > 0) {
				return message.reply(`Tag ${tagName} was edited.`);
			}
			return message.reply(`Could not find a tag with name ${tagName}.`);
		}
		else if (command === 'taginfo') {
			// [theta]
			const tagName = commandArgs;

			// equivalent to: SELECT * FROM tags WHERE name = 'tagName' LIMIT 1;
			const tag = await Tags.findOne({ where: { name: tagName } });
			if (tag) {
				return message.channel.send(`${tagName} was created by ${tag.username} at ${tag.createdAt} and has been used ${tag.usage_count} times.`);
			}
			return message.reply(`Could not find tag: ${tagName}`);
		}
		else if (command === 'showtags') {
			// [lambda]
			// equivalent to: SELECT name FROM tags;
			const tagList = await Tags.findAll({ attributes: ['name'] });
			const tagDesc = await Tags.findAll({ attributes: ['description'] });
			const tagString = tagList.map(t => t.name).join(', ') || 'No tags set.';
			const tagString2 = tagDesc.map(t => t.description).join(', ') || 'No tags set.';
			return message.channel.send(`List of tags: ${tagString} \n List of Desc: ${tagString2}`);

		}
		else if (command === 'removetag') {
			// [mu]
			const tagName = commandArgs;
			// equivalent to: DELETE from tags WHERE name = ?;
			const rowCount = await Tags.destroy({ where: { name: tagName } });
			if (!rowCount) return message.reply('That tag did not exist.');

			return message.reply('Tag deleted.');
		}
	}
});
// set  up for commands files
client.on('message', message => {
	if (!message.content.startsWith(prefix) || message.author.bot) return;

	const args = message.content.slice(prefix.length).trim().split(/ +/);
	const commandName = args.shift().toLowerCase();
	const command = client.commands.get(commandName)
		|| client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

	if (!command) return;

	if (command.guildOnly && message.channel.type === 'dm') {
		return message.reply('I can\'t execute that command inside DMs!');
	}

	// setting up cooldowns
	const { cooldowns } = client;
	if (!cooldowns.has(command.name)) {
		cooldowns.set(command.name, new Discord.Collection());
	}

	const now = Date.now();
	const timestamps = cooldowns.get(command.name);
	const cooldownAmount = (command.cooldown || 3) * 1000;

	if (timestamps.has(message.author.id)) {
		const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

		if (now < expirationTime) {
			const timeLeft = (expirationTime - now) / 1000;
			return message.reply(`please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`);
		}
	}
	timestamps.set(message.author.id, now);
	setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
	// checking for perms
	if (command.permissions) {
		const authorPerms = message.channel.permissionsFor(message.author);
		if (!authorPerms || !authorPerms.has(command.permissions)) {
			return message.reply('You can not do this!');
		}
	}
	// adding check for args
	if (command.args && !args.length) {
		let reply = `You didn't provide any arguments, ${message.author}!`;

		if (command.usage) {
			reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
		}

		return message.channel.send(reply);
	}
	try {
		command.execute(message, args);
	}
	catch (error) {
		console.error(error);
		message.reply('there was an error trying to execute that command!');
	}
});

client.login(token);