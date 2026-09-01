const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../config');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        logger.info(`Ready! Logged in as ${client.user.tag}`);
        logger.info(`Bot is online and serving ${client.guilds.cache.size} servers`);

        const commandData = [...client.commands.values()].map((command) =>
            command.data.toJSON(),
        );

        try {
            if (config.bot.registerGlobal) {
                await client.application.commands.set(commandData);
                logger.info(`Registered ${commandData.length} global slash commands`);
            } else if (config.bot.testGuildId) {
                await client.application.commands.set(
                    commandData,
                    config.bot.testGuildId,
                );
                logger.info(
                    `Registered ${commandData.length} slash commands in guild ${config.bot.testGuildId}`,
                );
            } else {
                let registeredGuilds = 0;

                for (const guild of client.guilds.cache.values()) {
                    await client.application.commands.set(commandData, guild.id);
                    registeredGuilds++;
                }

                logger.info(
                    `Registered ${commandData.length} slash commands in ${registeredGuilds} connected guilds`,
                );
            }
        } catch (error) {
            logger.error('Failed to register slash commands:', error);
        }
        
        client.user.setPresence({
            activities: [{
                name: 'slash commands & @commands | /help or @help',
                type: ActivityType.Listening
            }],
            status: 'online'
        });
        
        logger.info(`Connected to ${client.guilds.cache.size} guilds`);
        logger.info(`Loaded ${client.commands.size} commands`);
        
        setInterval(() => {
            const activities = [
                { name: 'slash commands & @commands | /help or @help', type: ActivityType.Listening },
                { name: `${client.guilds.cache.size} servers`, type: ActivityType.Watching },
                { name: 'for commands | /ping or @ping', type: ActivityType.Watching }
            ];
            
            const randomActivity = activities[Math.floor(Math.random() * activities.length)];
            
            client.user.setPresence({
                activities: [randomActivity],
                status: 'online'
            });
        }, 30 * 60 * 1000);
    },
};