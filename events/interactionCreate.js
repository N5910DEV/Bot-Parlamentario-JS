const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                logger.warn(`No command matching ${interaction.commandName} was found.`);
                return await interaction.reply({
                    content: 'This command is not recognized or may have been removed.',
                    ephemeral: true
                });
            }

            try {
                logger.info(`${interaction.user.tag} used /${interaction.commandName} in ${interaction.guild?.name || 'DM'}`);
                await command.execute(interaction);
            } catch (error) {
                logger.error(`Error executing command ${interaction.commandName}:`, error);
                
                const errorMessage = 'There was an error while executing this command!';
                
                try {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: errorMessage, ephemeral: true });
                    } else {
                        await interaction.reply({ content: errorMessage, ephemeral: true });
                    }
                } catch (followUpError) {
                    logger.error('Error sending error message:', followUpError);
                }
            }
        }
        
        else if (interaction.isButton()) {
            logger.info(`${interaction.user.tag} clicked button: ${interaction.customId}`);
        }
        
        else if (interaction.isStringSelectMenu()) {
            logger.info(`${interaction.user.tag} used select menu: ${interaction.customId}`);
        }
    },
};