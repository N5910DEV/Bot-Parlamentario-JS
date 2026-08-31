const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Responde con Pong! y muestra la latencia del bot.'),
    
    async execute(interaction) {
        try {
            const sent = await interaction.reply({ 
                content: 'Pinging...', 
                fetchReply: true 
            });
            
            const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
            const apiLatency = Math.round(interaction.client.ws.ping);
            
            await interaction.editReply(
                `🏓 Pong!\n` +
                `**Roundtrip latency:** ${roundtrip}ms\n` +
                `**WebSocket heartbeat:** ${apiLatency}ms`
            );
        } catch (error) {
            console.error('Error ejecutando este proceso:', error);
            
            const errorMessage = 'Error ejecutando este comando!';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    },
};
