const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Muestra una lista de comandos disponibles"),

    async execute(interaction) {
        try {
            const commands = interaction.client.commands;

            const helpEmbed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle("Comandos")
                .setDescription("Comandos Disponibles:")
                .setTimestamp()
                .setFooter({
                    text: `Requerido por ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                });

            commands.forEach((command) => {
                helpEmbed.addFields({
                    name: `/${command.data.name}`,
                    value: command.data.description,
                    inline: true,
                });
            });

            await interaction.reply({ embeds: [helpEmbed] });
        } catch (error) {
            console.error("Error ejecutando este proceso:", error);

            const errorMessage = "Error ejecutando este comando!";

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: errorMessage,
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                await interaction.reply({
                    content: errorMessage,
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
    },
};
