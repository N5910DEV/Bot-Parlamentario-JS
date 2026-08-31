const { SlashCommandBuilder } = require('discord.js');
const councilService = require('../services/CouncilService');
const { motionService, MotionResolution } = require('../services/MotionService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('votestats')
        .setDescription('Display council statistics'),
    
    async execute(interaction) {
        try {
            const council = councilService.getCouncil(interaction.channelId);
            
            if (!council.enabled) {
                return interaction.reply({
                    content: '❌ No hay ningun consejo en este canal.',
                    ephemeral: true
                });
            }

            const allMotions = motionService.getAllMotions(interaction.channelId);

            if (allMotions.length === 0) {
                return interaction.reply({
                    content: '📊 No hay estadisticas aun. Crea tu mocion con: `/motion create`.',
                    ephemeral: true
                });
            }

            let passed = 0;
            let failed = 0;
            let killed = 0;
            let active = 0;

            const participationMap = {};

            for (const motion of allMotions) {
                if (motion.resolution === MotionResolution.Passed) passed++;
                else if (motion.resolution === MotionResolution.Failed) failed++;
                else if (motion.resolution === MotionResolution.Killed) killed++;
                else active++;

                for (const vote of motion.votes) {
                    if (!participationMap[vote.authorId]) {
                        participationMap[vote.authorId] = {
                            name: vote.authorName,
                            votes: 0
                        };
                    }
                    if (vote.state !== undefined) {
                        participationMap[vote.authorId].votes++;
                    }
                }
            }

            const topVoters = Object.values(participationMap)
                .sort((a, b) => b.votes - a.votes)
                .slice(0, 5);

            let stats = `**📊 Council Stats por ${council.name}**\n\n`;
            
            stats += `**Stats de la Mocion:**\n`;
            stats += `Total Mocions: ${allMotions.length}\n`;
            stats += `✅ Pasadas: ${passed}\n`;
            stats += `❌ Fallidas: ${failed}\n`;
            stats += `🗑️ Killed: ${killed}\n`;
            stats += `📝 Activas: ${active}\n\n`;

            const resolvedMotions = allMotions.length - active;
            const passRate = resolvedMotions > 0
                ? `${((passed / resolvedMotions) * 100).toFixed(1)}%`
                : 'N/A';
            stats += `Pass Rate: ${passRate}\n\n`;

            if (topVoters.length > 0) {
                stats += `**Top Votantes:**\n`;
                for (let i = 0; i < topVoters.length; i++) {
                    stats += `${i + 1}. **${topVoters[i].name}** - ${topVoters[i].votes} votes\n`;
                }
            }

            await interaction.reply({
                content: stats,
                ephemeral: false
            });

        } catch (error) {
            console.error('Error executing votestats command:', error);
            
            const errorMessage = 'There was an error while executing this command!';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    },
};