const { SlashCommandBuilder } = require("discord.js");
const councilService = require("../services/CouncilService");
const {
    motionService,
    MotionResolution,
} = require("../services/MotionService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("archive")
        .setDescription("Mirar mociones pasadas")
        .addIntegerOption((option) =>
            option
                .setName("motion_number")
                .setDescription(
                    "El Numero de Mociones para ver (dejar en blanco para ver todas)",
                )
                .setRequired(false)
                .setMinValue(1),
        ),

    async execute(interaction) {
        try {
            const council = councilService.getCouncil(interaction.channelId);

            if (!council.enabled) {
                return interaction.reply({
                    content: "❌ No hay ningun consejo en este canal.",
                    ephemeral: true,
                });
            }

            const motionNumber =
                interaction.options.getInteger("motion_number");
            const allMotions = motionService.getAllMotions(
                interaction.channelId,
            );

            if (allMotions.length === 0) {
                return interaction.reply({
                    content: "📜 No se encontraron mociones en el archivo.",
                    ephemeral: true,
                });
            }

            if (motionNumber) {
                const index = motionNumber - 1;

                if (index < 0 || index >= allMotions.length) {
                    return interaction.reply({
                        content: `❌ Mocion #${motionNumber} no fue encontrada. Rango Valido: 1-${allMotions.length}`,
                        ephemeral: true,
                    });
                }

                const weights = await councilService.calculateGuildTotalWeight(
                    interaction.channelId,
                    interaction.guild,
                );

                const embed = motionService.createMotionEmbed(
                    interaction.channelId,
                    index,
                    weights,
                );

                await interaction.reply({ embeds: [embed] });
            } else {
                let summary = `**📜 Mocion Archivada por ${council.name}**\n\n`;
                summary += `Total de Mociones: ${allMotions.length}\n\n`;

                const recentMotions = allMotions.slice(-10).reverse();

                for (let i = 0; i < recentMotions.length; i++) {
                    const motion = recentMotions[i];
                    const actualIndex = allMotions.length - 1 - i;
                    const number = actualIndex + 1;

                    let status = "";
                    if (motion.resolution === MotionResolution.Passed) {
                        status = "✅ Pasadas";
                    } else if (motion.resolution === MotionResolution.Failed) {
                        status = "❌ Fallidas";
                    } else if (motion.resolution === MotionResolution.Killed) {
                        status = "🗑️ Killed";
                    } else {
                        status = "📝 Activas";
                    }

                    const shortText =
                        motion.text.length > 50
                            ? motion.text.substring(0, 50) + "..."
                            : motion.text;

                    summary += `**#${number}** ${status} - ${shortText}\n`;
                }

                if (allMotions.length > 10) {
                    summary += `\n_Para Mostrar 10 de la mas recientes mociones. Usar \`/archive motion_number:#\`para ver una mocion especifica._`;
                }

                await interaction.reply({
                    content: summary,
                    ephemeral: false,
                });
            }
        } catch (error) {
            console.error("Error executing archive command:", error);

            const errorMessage =
                "There was an error while executing this command!";

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: errorMessage,
                    ephemeral: true,
                });
            } else {
                await interaction.reply({
                    content: errorMessage,
                    ephemeral: true,
                });
            }
        }
    },
};
