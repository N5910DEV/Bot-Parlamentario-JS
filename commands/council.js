const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const councilService = require("../services/CouncilService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("council")
        .setDescription("Manejar council de este canal")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("create")
                .setDescription("Crea un council en este canal")
                .addStringOption((option) =>
                    option
                        .setName("name")
                        .setDescription("Nombre del council")
                        .setRequired(false)
                        .setMaxLength(100),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("remove")
                .setDescription("Eliminar el council de este canal"),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("info")
                .setDescription("Mostrar informacion del council"),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        try {
            if (!interaction.member.permissions.has("ManageGuild")) {
                return interaction.reply({
                    content: "Necesitas permisos de administrador del servidor.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            const subcommand = interaction.options.getSubcommand();

            if (subcommand === "create") {
                const name = interaction.options.getString("name") || "Council";
                councilService.createCouncil(interaction.channelId, name);

                await interaction.reply({
                    content: `Council "${name}" ha sido creado en este canal! usa \`/motion\` para proponer mociones.`,
                });
            } else if (subcommand === "remove") {
                const council = councilService.getCouncil(
                    interaction.channelId,
                );

                if (!council.enabled) {
                    return interaction.reply({
                        content: "No hay ningun council en este canal.",
                        flags: MessageFlags.Ephemeral,
                    });
                }

                councilService.removeCouncil(interaction.channelId);

                await interaction.reply({
                    content: "Council ha sido removido de este canal.",
                });
            } else if (subcommand === "info") {
                const council = councilService.getCouncil(
                    interaction.channelId,
                );

                if (!council.enabled) {
                    return interaction.reply({
                        content: "No hay ningun council en este canal.",
                        flags: MessageFlags.Ephemeral,
                    });
                }

                const motionCount = council.motions
                    ? council.motions.length
                    : 0;
                const activeMotion = council.motions
                    ? council.motions.find((m) => m.active)
                    : null;

                let info = `**Council:** ${council.name}\n`;
                info += `**Mociones Totales:** ${motionCount}\n`;
                info += `**Mociones Activas:** ${activeMotion ? "Yes" : "No"}\n`;
                info += `**Majority Default:** ${(council.majorityDefault * 100).toFixed(0)}%\n`;

                if (council.councilorRole) {
                    info += `**Councilor Role:** <@&${council.councilorRole}>\n`;
                }

                await interaction.reply({
                    content: info,
                });
            }
        } catch (error) {
            console.error("Error executing council command:", error);

            const errorMessage =
                "There was an error while executing this command!";

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
