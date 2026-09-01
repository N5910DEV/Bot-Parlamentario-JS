const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Muestra informacion del bot y del servidor'),
    
    async execute(interaction) {
        try {
            const client = interaction.client;
            const guild = interaction.guild;
            
            // Calculate uptime
            const uptime = process.uptime();
            const uptimeHours = Math.floor(uptime / 3600);
            const uptimeMinutes = Math.floor((uptime % 3600) / 60);
            const uptimeSeconds = Math.floor(uptime % 60);
            const uptimeString = `${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s`;
            
            // Memory usage
            const memoryUsage = process.memoryUsage();
            const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
            
            const infoEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🤖 Bot Information')
                .setThumbnail(client.user.displayAvatarURL())
                .addFields(
                    {
                        name: '📊 Bot Stats',
                        value: `**Servers:** ${client.guilds.cache.size}\n` +
                               `**Usuarios:** ${client.users.cache.size}\n` +
                               `**Comandos:** ${client.commands.size}`,
                        inline: true
                    },
                    {
                        name: '⚡ Performance',
                        value: `**Uptime:** ${uptimeString}\n` +
                               `**Memoria:** ${memoryMB} MB\n` +
                               `**Ping:** ${Math.round(client.ws.ping)}ms`,
                        inline: true
                    },
                    {
                        name: '🛠️ Technical',
                        value: `**Node.js:** ${process.version}\n` +
                               `**Discord.js:** v${require('discord.js').version}\n` +
                               `**Plataforma:** ${process.platform}`,
                        inline: true
                    }
                )
                .setTimestamp()
                .setFooter({ 
                    text: `Requerido por ${interaction.user.tag}`, 
                    iconURL: interaction.user.displayAvatarURL() 
                });

            // Add server-specific info if in a guild
            if (guild) {
                infoEmbed.addFields({
                    name: '🏠 Server Info',
                    value: `**Nombre:** ${guild.name}\n` +
                           `**Miembros:** ${guild.memberCount}\n` +
                           `**Creado:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
                    inline: false
                });
            }

            await interaction.reply({ embeds: [infoEmbed] });
        } catch (error) {
            console.error('Error ejecutando informacion:', error);
            
            const errorMessage = 'Error ejecutando este comando!';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    },
};
