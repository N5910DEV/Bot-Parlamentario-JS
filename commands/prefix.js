const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Cambia el prefijo del bot')
        .addStringOption(option =>
            option.setName('new_prefix')
                .setDescription('Nuevo prefijo para el bot')
                .setRequired(true)
                .setMaxLength(3)),
    
    async execute(interaction) {
        try {
            // Check if user has administrator permission
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({
                    content: 'Necesitas administrador!',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            const newPrefix = interaction.options.getString('new_prefix');

            if (!newPrefix || !newPrefix.trim()) {
                return interaction.reply({
                    content: 'Debes indicar un prefijo nuevo.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            // Validate prefix
            if (newPrefix.length > 3) {
                return interaction.reply({
                    content: 'Prefix debe tener menos de 3 caracteres!',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            if (newPrefix.includes(' ')) {
                return interaction.reply({
                    content: 'Prefix no debe tener espacios!',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            // Store the old prefix for the response
            const oldPrefix = config.bot.prefix;
            
            // Update the prefix in config (runtime only)
            config.bot.prefix = newPrefix;
            
            await interaction.reply({
                content: `Bot prefix cambiado de \`${oldPrefix}\` a \`${newPrefix}\`!\n` +
                        `Ahora puedes usar los comandos: \`${newPrefix}help\``
            });
            
            // Log the change
            const logger = require('../utils/logger');
            logger.info(`Prefix cambiado de "${oldPrefix}" a "${newPrefix}" por ${interaction.user.tag} en ${interaction.guild?.name || 'DM'}`);
            
        } catch (error) {
            console.error('Error ejecutando comando de prefix:', error);
            
            const errorMessage = 'Error Ejecutando este comando!';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
            }
        }
    },
    
    async executePrefix(message, args) {
        try {
            // Check if user has administrator permission
            if (!message.member.permissions.has('Administrator')) {
                return message.reply('Necesitas administrador!');
            }
            
            if (args.length === 0) {
                return message.reply(`Please provide a new prefix! Usage: \`${config.bot.prefix}prefix <new_prefix>\``);
            }
            
            const newPrefix = args[0];
            
            // Validate prefix
            if (newPrefix.length > 3) {
                return message.reply('Prefix debe tener menos de 3 caracteres!');
            }
            
            if (newPrefix.includes(' ')) {
                return message.reply('Prefix no debe tener espacios!');
            }
            
            // Store the old prefix for the response
            const oldPrefix = config.bot.prefix;
            
            // Update the prefix in config (runtime only)
            config.bot.prefix = newPrefix;
            
            await message.reply(
                `Bot prefix cambiado de \`${oldPrefix}\` a \`${newPrefix}\`!\n` +
                `Ahora puedes usar los comandos: \`${newPrefix}help\``
            );
            
            // Log the change
            const logger = require('../utils/logger');
            logger.info(`Prefix cambiado de "${oldPrefix}" a "${newPrefix}" por ${message.author.tag} en ${message.guild?.name || 'DM'}`);
            
        } catch (error) {
            console.error('Error Ejecutando el prefijo este comando:', error);
            message.reply('Error Ejecutando este comando!');
        }
    },
};