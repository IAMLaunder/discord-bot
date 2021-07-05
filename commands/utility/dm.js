module.exports = {
	name: 'send message',
	description: 'Sends a message to the user',
	execute(message) {
		//message.channel.send(`Server name: ${message.guild.name}\nTotal members: ${message.guild.memberCount}`);
        const user = client.users.cache.get('<id>');
        message.author.send('oi cunt');
	},
};