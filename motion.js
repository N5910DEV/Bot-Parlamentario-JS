const { SlashCommandBuilder } = require('discord.js');
const councilService = require('../services/CouncilService');
const { motionService, MotionResolution } = require('../services/MotionService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('motion')
        .setDescription('Create or manage motions')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new motion')
                .addStringOption(option =>
                    option.setName('text')
                        .setDescription('The motion text')
                        .setRequired(true)
                        .setMaxLength(2000)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View the current active motion'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('kill')
                .setDescription('Kill the current motion')),
    
    async execute(interaction) {
        try {
            const council = councilService.getCouncil(interaction.channelId);
            
            if (!council.enabled) {
                return interaction.reply({
                    content: '❌ There is no council in this channel. Use `/council create` first.',
                    ephemeral: true
                });
            }

            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'create') {
                if (
                    council.proposeRole &&
                    !interaction.member.roles.cache.has(council.proposeRole)
                ) {
                    return interaction.reply({
                        content: '❌ No tienes el rol necesario para proponer mociones.',
                        ephemeral: true
                    });
                }

                const currentMotion = motionService.getCurrentMotion(interaction.channelId);
                
                if (currentMotion && !council.motionQueue) {
                    return interaction.reply({
                        content: '❌ There is already an active motion. Wait for it to finish or use `/motion kill` to cancel it.',
                        ephemeral: true
                    });
                }

                const inputText = interaction.options.getString('text');

                if (councilService.isUserOnCooldown(interaction.channelId, interaction.user.id)) {
                    const cooldown = councilService.getUserCooldown(interaction.channelId, interaction.user.id);
                    const hours = (cooldown / 3600000).toFixed(2);
                    return interaction.reply({
                        content: `❌ You must wait ${hours} hours between motions.`,
                        ephemeral: true
                    });
                }

                let text = inputText;
                let options = {};

                try {
                    const parsed = motionService.parseMotionOptions(inputText);
                    text = parsed.text;
                    options = parsed.options;

                    if (!text.trim()) {
                        return interaction.reply({
                            content: '❌ La mocion debe incluir un texto.',
                            ephemeral: true
                        });
                    }

                    if (
                        options.majority !== undefined &&
                        options.majority < council.majorityMinimum
                    ) {
                        return interaction.reply({
                            content: `❌ The majority type must be at least ${(council.majorityMinimum * 100).toFixed(0)}%.`,
                            ephemeral: true
                        });
                    }
                } catch (error) {
                    return interaction.reply({
                        content: `❌ Invalid motion options: ${error.message}`,
                        ephemeral: true
                    });
                }

                const { motion, index } = motionService.createMotion(interaction.channelId, {
                    text,
                    authorId: interaction.user.id,
                    authorName: interaction.member.displayName,
                    options
                });

                const weights = councilService.calculateTotalWeight(
                    interaction.channelId,
                    interaction.guild.members.cache
                );

                const embed = motionService.createMotionEmbed(interaction.channelId, index, weights);

                await interaction.reply({
                    content: `📜 **New motion proposed!** Use \`/yes\`, \`/no\`, or \`/abstain\` to vote.`,
                    embeds: [embed]
                });

            } else if (subcommand === 'view') {
                const currentMotion = motionService.getCurrentMotion(interaction.channelId);
                
                if (!currentMotion) {
                    return interaction.reply({
                        content: '❌ There is no active motion. Use `/motion create` to start one.',
                        ephemeral: true
                    });
                }

                const weights = councilService.calculateTotalWeight(
                    interaction.channelId,
                    interaction.guild.members.cache
                );

                const embed = motionService.createMotionEmbed(interaction.channelId, currentMotion.index, weights);

                await interaction.reply({ embeds: [embed] });

            } else if (subcommand === 'kill') {
                const currentMotion = motionService.getCurrentMotion(interaction.channelId);
                
                if (!currentMotion) {
                    return interaction.reply({
                        content: '❌ There is no active motion.',
                        ephemeral: true
                    });
                }

                const isAuthor = currentMotion.motion.authorId === interaction.user.id;
                const isAdmin = interaction.member.permissions.has('ManageGuild');
                
                if (!isAuthor && !isAdmin) {
                    return interaction.reply({
                        content: '❌ Only the motion author or administrators can kill a motion.',
                        ephemeral: true
                    });
                }

                motionService.killMotion(interaction.channelId, currentMotion.index);

                await interaction.reply({
                    content: `🗑️ Motion #${currentMotion.index + 1} has been killed.`,
                    ephemeral: false
                });
            }
        } catch (error) {
            console.error('Error executing motion command:', error);
            
            const errorMessage = 'There was an error while executing this command!';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    },
};