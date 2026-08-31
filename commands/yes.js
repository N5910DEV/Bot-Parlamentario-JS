const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const councilService = require("../services/CouncilService");
const { motionService, CastVoteStatus } = require("../services/MotionService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("yes")
        .setDescription("Vota Aye en la siguiente mocion")
        .addStringOption((option) =>
            option
                .setName("reason")
                .setDescription("Motivo de tu voto")
                .setRequired(false)
                .setMaxLength(500),
        ),

    async execute(interaction) {
        try {
            const council = councilService.getCouncil(interaction.channelId);

            if (!council.enabled) {
                return interaction.reply({
                    content: "No hay ningun consejo en este canal.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            if (
                council.councilorRole &&
                !interaction.member.roles.cache.has(council.councilorRole)
            ) {
                return interaction.reply({
                    content: "Solo los miembros del council pueden votar.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            const currentMotion = motionService.getCurrentMotion(
                interaction.channelId,
            );

            if (!currentMotion) {
                return interaction.reply({
                    content: "No hay ninguna mocion aun.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            const reason = interaction.options.getString("reason") || "";

            if (council.reasonRequiredYes && !reason) {
                return interaction.reply({
                    content: "Debes dar el motivo de tu voto.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            const isDictator =
                council.dictatorRole &&
                interaction.member.roles.cache.has(council.dictatorRole);

            const weights = councilService.calculateTotalWeight(
                interaction.channelId,
                interaction.guild.members.cache,
            );

            const vote = {
                authorId: interaction.user.id,
                authorName: interaction.member.displayName,
                state: 1,
                name: "Aye",
                reason,
                isDictator,
            };

            const status = motionService.castVote(
                interaction.channelId,
                currentMotion.index,
                vote,
                weights,
            );

            if (status === CastVoteStatus.Failed) {
                return interaction.reply({
                    content: "Fallo al votar.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            const embed = motionService.createMotionEmbed(
                interaction.channelId,
                currentMotion.index,
                weights,
            );

            const message =
                status === CastVoteStatus.Changed
                    ? "Voto cambiado a **Aye**"
                    : "Votaste **Aye**";

            await interaction.reply({
                content: message,
                embeds: [embed],
            });
        } catch (error) {
            console.error("Error executing yes command:", error);

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
