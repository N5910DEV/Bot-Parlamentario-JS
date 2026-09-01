const { Events } = require('discord.js');
const config = require('../config');
const logger = require('../utils/logger');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;
        
        if (!message.content.startsWith(config.bot.prefix)) return;
        
        const args = message.content.slice(config.bot.prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        const command = message.client.commands.get(commandName);
        
        if (!command) {
            return message.reply(`Unknown command! Use \`${config.bot.prefix}help\` to see available commands.`);
        }
        
        try {
            logger.info(`${message.author.tag} used ${config.bot.prefix}${commandName} in ${message.guild?.name || 'DM'}`);
            
            const hasSubcommands = command.data.options?.some(
                (option) => option.toJSON().type === 1,
            );
            const subcommand = hasSubcommands ? args[0]?.toLowerCase() : undefined;
            const subcommandArgs = hasSubcommands ? args.slice(1) : args;
            let replyMessage;

            const mockInteraction = {
                reply: async (options) => {
                    if (typeof options === 'string') {
                        replyMessage = await message.reply(options);
                        return replyMessage;
                    }

                    replyMessage = await message.reply({
                        content: options.content,
                        embeds: options.embeds,
                    });
                    return replyMessage;
                },
                editReply: async (content) => {
                    if (replyMessage) {
                        return replyMessage.edit(content);
                    }
                    return message.channel.send(content);
                },
                followUp: async (options) => {
                    if (typeof options === 'string') {
                        return message.channel.send(options);
                    }
                    return message.channel.send(options.content || options);
                },
                user: message.author,
                guild: message.guild,
                client: message.client,
                member: message.member,
                channelId: message.channelId,
                options: {
                    getSubcommand: () => subcommand,
                    getString: (name) => {
                        if (name === 'text' || name === 'reason' || name === 'name') {
                            return subcommandArgs.join(' ') || null;
                        }
                        if (name === 'setting') {
                            return subcommandArgs[0] || null;
                        }
                        if (name === 'value') {
                            return subcommandArgs.slice(1).join(' ') || null;
                        }
                        if (name === 'new_prefix') {
                            return subcommandArgs[0] || null;
                        }
                        return null;
                    },
                    getInteger: (name) => {
                        if (name === 'motion_number' || name === 'amount') {
                            const value = Number.parseInt(
                                subcommandArgs[subcommandArgs.length - 1],
                                10,
                            );
                            return Number.isNaN(value) ? null : value;
                        }
                        return null;
                    },
                    getUser: () => {
                        const mention = subcommandArgs.find((arg) =>
                            /^<@!?(\d+)>$/.test(arg),
                        );
                        const userId = mention
                            ? mention.match(/^<@!?(\d+)>$/)[1]
                            : message.author.id;
                        return (
                            message.guild?.members?.cache?.get(userId)?.user || {
                                id: userId,
                            }
                        );
                    },
                },
                createdTimestamp: message.createdTimestamp,
                get replied() {
                    return Boolean(replyMessage);
                },
                deferred: false
            };
            
            if (command.executePrefix) {
                await command.executePrefix(message, args);
            } else {
                await command.execute(mockInteraction);
            }
            
        } catch (error) {
            logger.error(`Error executing prefix command ${commandName}:`, error);
            message.reply('There was an error while executing this command!');
        }
    },
};