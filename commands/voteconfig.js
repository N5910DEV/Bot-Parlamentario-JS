const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const councilService = require("../services/CouncilService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("voteconfig")
        .setDescription("Configure council settings")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("set")
                .setDescription("Set a configuration value")
                .addStringOption((option) =>
                    option
                        .setName("setting")
                        .setDescription("The setting to configure")
                        .setRequired(true)
                        .addChoices(
                            { name: "Councilor Role", value: "councilorRole" },
                            { name: "Dictator Role", value: "dictatorRole" },
                            { name: "Propose Role", value: "proposeRole" },
                            {
                                name: "User Cooldown (hours)",
                                value: "userCooldown",
                            },
                            {
                                name: "Motion Expiration (hours)",
                                value: "motionExpiration",
                            },
                            {
                                name: "Majority Default (%)",
                                value: "majorityDefault",
                            },
                            {
                                name: "Majority Minimum (%)",
                                value: "majorityMinimum",
                            },
                            {
                                name: "Majority Reached Ends",
                                value: "majorityReachedEnds",
                            },
                            {
                                name: "Reason Required (Yes)",
                                value: "reasonRequiredYes",
                            },
                            {
                                name: "Reason Required (No)",
                                value: "reasonRequiredNo",
                            },
                            {
                                name: "Reason Required (Abstain)",
                                value: "reasonRequiredAbstain",
                            },
                            { name: "Motion Queue", value: "motionQueue" },
                        ),
                )
                .addStringOption((option) =>
                    option
                        .setName("value")
                        .setDescription("The value to set")
                        .setRequired(true),
                ),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("view")
                .setDescription("View current configuration"),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        try {
            if (!interaction.member.permissions.has("ManageGuild")) {
                return interaction.reply({
                    content:
                        "❌ Necesitas permisos de administrador del servidor.",
                    ephemeral: true,
                });
            }

            const council = councilService.getCouncil(interaction.channelId);

            if (!council.enabled) {
                return interaction.reply({
                    content:
                        "❌ No hay ningun consejo en este canal. Usa `/council create` primero.",
                    ephemeral: true,
                });
            }

            const subcommand = interaction.options.getSubcommand();

            if (subcommand === "set") {
                const setting = interaction.options.getString("setting");
                const valueStr = interaction.options.getString("value");
                let value = valueStr;

                if (setting.endsWith("Role")) {
                    const roleMatch = valueStr.match(/<@&(\d+)>/);
                    if (roleMatch) {
                        value = roleMatch[1];
                    } else {
                        const role = interaction.guild.roles.cache.find(
                            (r) => r.name === valueStr,
                        );
                        if (role) {
                            value = role.id;
                        } else {
                            return interaction.reply({
                                content: "❌ Rol no encontrado.",
                                ephemeral: true,
                            });
                        }
                    }
                } else if (
                    setting === "userCooldown" ||
                    setting === "motionExpiration"
                ) {
                    value = parseFloat(valueStr) * 3600000;
                    if (isNaN(value)) {
                        return interaction.reply({
                            content: "❌ Pon un número valido de horas.",
                            ephemeral: true,
                        });
                    }
                } else if (
                    setting === "majorityDefault" ||
                    setting === "majorityMinimum"
                ) {
                    value = parseFloat(valueStr) / 100;
                    if (isNaN(value) || value < 0 || value > 1) {
                        return interaction.reply({
                            content: "❌ Pon un porcentaje entre 0 y 100.",
                            ephemeral: true,
                        });
                    }
                } else if (
                    setting.includes("Required") ||
                    setting.includes("Queue") ||
                    setting.includes("Ends")
                ) {
                    value =
                        valueStr.toLowerCase() === "true" || valueStr === "1";
                }

                councilService.setConfig(interaction.channelId, setting, value);

                await interaction.reply({
                    content: `✅ Configuracion Actualizada: **${setting}** = ${valueStr}`,
                    ephemeral: false,
                });
            } else if (subcommand === "view") {
                let config = `**Council Configuration for ${council.name}**\n\n`;

                config += `**Councilor Role:** ${council.councilorRole ? `<@&${council.councilorRole}>` : "None"}\n`;
                config += `**Dictator Role:** ${council.dictatorRole ? `<@&${council.dictatorRole}>` : "None"}\n`;
                config += `**Propose Role:** ${council.proposeRole ? `<@&${council.proposeRole}>` : "None"}\n`;
                config += `**User Cooldown:** ${(council.userCooldown / 3600000).toFixed(2)} hours\n`;
                config += `**Motion Expiration:** ${(council.motionExpiration / 3600000).toFixed(2)} hours\n`;
                config += `**Default Majority:** ${(council.majorityDefault * 100).toFixed(0)}%\n`;
                config += `**Minimum Majority:** ${(council.majorityMinimum * 100).toFixed(0)}%\n`;
                config += `**Majority Reached Ends:** ${council.majorityReachedEnds ? "Yes" : "No"}\n`;
                config += `**Reason Required (Yes):** ${council.reasonRequiredYes ? "Yes" : "No"}\n`;
                config += `**Reason Required (No):** ${council.reasonRequiredNo ? "Yes" : "No"}\n`;
                config += `**Reason Required (Abstain):** ${council.reasonRequiredAbstain ? "Yes" : "No"}\n`;
                config += `**Motion Queue:** ${council.motionQueue ? "Enabled" : "Disabled"}\n`;

                await interaction.reply({
                    content: config,
                    ephemeral: false,
                });
            }
        } catch (error) {
            console.error("Error executing voteconfig command:", error);

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
