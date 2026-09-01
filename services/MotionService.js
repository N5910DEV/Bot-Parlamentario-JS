const councilService = require("./CouncilService");
const { calculateVoteTotals, parseMajorityType } = require("./VoteService");
const minimist = require("minimist");
const num2fraction = require("num2fraction");
const { EmbedBuilder } = require("discord.js");

const MotionResolution = {
    Unresolved: 0,
    Killed: 1,
    Passed: 2,
    Failed: 3,
};

const CastVoteStatus = {
    New: 0,
    Changed: 1,
    Failed: 2,
};

class MotionService {
    parseMotionOptions(input) {
        const args = minimist(input.split(" "), {
            boolean: ["unanimous"],
            alias: {
                u: "unanimous",
                m: "majority",
            },
        });

        const options = {};

        if (args.unanimous) {
            options.majority = 1;
        } else if (args.majority) {
            try {
                options.majority = parseMajorityType(args.majority);
            } catch (error) {
                throw error;
            }
        }

        return {
            text: args._.join(" "),
            options,
        };
    }

    createMotion(channelId, { text, authorId, authorName, options = {} }) {
        const council = councilService.getCouncil(channelId);

        if (!council.motions) {
            council.motions = [];
        }

        const motionData = {
            authorId,
            authorName,
            active: true,
            resolution: MotionResolution.Unresolved,
            text,
            createdAt: Date.now(),
            didExpire: false,
            votes: [],
            options,
        };

        council.motions.push(motionData);
        councilService.saveCouncil(channelId);

        return {
            motion: motionData,
            index: council.motions.length - 1,
        };
    }

    getCurrentMotion(channelId) {
        const council = councilService.getCouncil(channelId);
        if (!council.motions) return null;

        for (let i = council.motions.length - 1; i >= 0; i--) {
            if (council.motions[i].active) {
                return {
                    motion: council.motions[i],
                    index: i,
                };
            }
        }

        return null;
    }

    getMotion(channelId, index) {
        const council = councilService.getCouncil(channelId);
        if (!council.motions || !council.motions[index]) return null;

        return {
            motion: council.motions[index],
            index,
        };
    }

    getAllMotions(channelId) {
        const council = councilService.getCouncil(channelId);
        return council.motions || [];
    }

    castVote(channelId, motionIndex, newVote, weights) {
        const council = councilService.getCouncil(channelId);
        const motion = council.motions[motionIndex];

        if (!motion || !motion.active) {
            return CastVoteStatus.Failed;
        }

        if (newVote.isDictator && newVote.state !== 0) {
            this.resolveMotion(
                channelId,
                motionIndex,
                newVote.state === 1
                    ? MotionResolution.Passed
                    : MotionResolution.Failed,
            );
        }

        for (const [index, vote] of motion.votes.entries()) {
            if (vote.authorId === newVote.authorId) {
                motion.votes[index] = newVote;
                councilService.saveCouncil(channelId);
                this.checkVotes(channelId, motionIndex, weights);
                return CastVoteStatus.Changed;
            }
        }

        motion.votes.push(newVote);
        councilService.saveCouncil(channelId);
        this.checkVotes(channelId, motionIndex, weights);
        return CastVoteStatus.New;
    }

    getRequiredMajority(channelId, motion) {
        const council = councilService.getCouncil(channelId);

        if (motion.options && motion.options.majority !== undefined) {
            return motion.options.majority;
        }

        return council.majorityDefault ?? 0.5;
    }

    getReadableMajority(majority) {
        if (majority === 1) return "Unanimous";
        if (majority === 0.5) return "Simple majority";
        return num2fraction(majority);
    }

    getVoteTotals(channelId, motionIndex, weights) {
        const council = councilService.getCouncil(channelId);
        const motion = council.motions[motionIndex];

        if (!motion) return null;

        const requiredMajority = this.getRequiredMajority(channelId, motion);
        const totalSize = weights ? weights.total : 1;

        return calculateVoteTotals({
            votes: motion.votes,
            requiredMajority,
            totalSize,
            weights,
        });
    }

    isExpired(channelId, motion) {
        const council = councilService.getCouncil(channelId);
        if (!council.motionExpiration) return false;

        return Date.now() - motion.createdAt > council.motionExpiration;
    }

    checkVotes(channelId, motionIndex, weights) {
        const council = councilService.getCouncil(channelId);
        const motion = council.motions[motionIndex];

        if (!motion || motion.resolution !== MotionResolution.Unresolved) {
            return;
        }

        const votes = this.getVoteTotals(channelId, motionIndex, weights);
        const expired = this.isExpired(channelId, motion);

        if (expired) {
            if (votes.yes > votes.no) {
                this.resolveMotion(
                    channelId,
                    motionIndex,
                    MotionResolution.Passed,
                );
            } else if (votes.no > votes.yes) {
                this.resolveMotion(
                    channelId,
                    motionIndex,
                    MotionResolution.Failed,
                );
            }
            return;
        }

        const totalSize = weights ? weights.total : 1;
        const votedWeight = motion.votes.reduce((total, vote) => {
            if (vote.state === undefined) return total;
            const weight = weights
                ? (weights.users[vote.authorId] ?? 0)
                : 1;
            return total + weight;
        }, 0);

        if (council.majorityReachedEnds || votedWeight >= totalSize) {
            if (votes.yes >= votes.toPass) {
                this.resolveMotion(
                    channelId,
                    motionIndex,
                    MotionResolution.Passed,
                );
            } else if (votes.no >= votes.toPass || votes.toPass === 0) {
                this.resolveMotion(
                    channelId,
                    motionIndex,
                    MotionResolution.Failed,
                );
            } else if (totalSize - (votes.no + votes.abs) < votes.toPass) {
                this.resolveMotion(
                    channelId,
                    motionIndex,
                    MotionResolution.Failed,
                );
            }
        }
    }

    resolveMotion(channelId, motionIndex, resolution) {
        const council = councilService.getCouncil(channelId);
        const motion = council.motions[motionIndex];

        if (!motion || !motion.active) {
            return;
        }

        motion.active = false;
        motion.resolution = resolution;
        motion.didExpire = this.isExpired(channelId, motion);

        if (
            (resolution === MotionResolution.Failed ||
                resolution === MotionResolution.Passed) &&
            !council.userCooldownKill
        ) {
            councilService.setUserCooldown(
                channelId,
                motion.authorId,
                motion.createdAt,
            );
        }

        councilService.saveCouncil(channelId);
    }

    killMotion(channelId, motionIndex) {
        this.resolveMotion(channelId, motionIndex, MotionResolution.Killed);
    }

    getRemainingVoters(channelId, motionIndex, guildMembers) {
        const council = councilService.getCouncil(channelId);
        const motion = council.motions[motionIndex];

        if (!motion) return [];

        const votedUsers = {};
        for (const vote of motion.votes) {
            if (vote.state !== undefined) {
                votedUsers[vote.authorId] = true;
            }
        }

        const remaining = [];
        for (const [memberId, member] of guildMembers) {
            if (!votedUsers[memberId] && !member.user.bot) {
                if (council.councilorRole) {
                    if (member.roles.cache.has(council.councilorRole)) {
                        remaining.push(member);
                    }
                } else {
                    remaining.push(member);
                }
            }
        }

        return remaining;
    }

    createMotionEmbed(channelId, motionIndex, weights) {
        const council = councilService.getCouncil(channelId);
        const motion = council.motions[motionIndex];

        if (!motion) return null;

        const votes = this.getVoteTotals(channelId, motionIndex, weights);
        const requiredMajority = this.getRequiredMajority(channelId, motion);
        const readableMajority = this.getReadableMajority(requiredMajority);

        let title = `Mocion #${motionIndex + 1}`;
        let color = 0x3498db;

        if (motion.active) {
            title += " | Actualmente Activas";
        } else {
            if (motion.resolution === MotionResolution.Passed) {
                title += " | ✅ Pasadas";
                color = 0x2ecc71;
            } else if (motion.resolution === MotionResolution.Failed) {
                title += " | ❌ Fallidas";
                color = 0xe74c3c;
            } else if (motion.resolution === MotionResolution.Killed) {
                title += " | 🗑️ Killed";
                color = 0x95a5a6;
            }
        }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(motion.text)
            .setTimestamp(motion.createdAt)
            .setFooter({ text: `Propuesto por ${motion.authorName}` });

        embed.addFields([
            {
                name: "✅ Favor",
                value: votes.yes.toString(),
                inline: true,
            },
            {
                name: "❌ Contra",
                value: votes.no.toString(),
                inline: true,
            },
            {
                name: "⏸️ Abstain",
                value: votes.abs.toString(),
                inline: true,
            },
        ]);

        if (motion.active) {
            embed.addFields([
                {
                    name: "Requiere Majority",
                    value: `${readableMajority} (${votes.toPass} votos necesarios para pasar)`,
                    inline: false,
                },
            ]);
        }

        if (motion.votes.length > 0) {
            const votesList = motion.votes
                .map((v) => {
                    const stateName =
                        v.state === 1
                            ? "✅ Aye"
                            : v.state === -1
                              ? "❌ No"
                              : "⏸️ Abstain";
                    const reason = v.reason ? `: ${v.reason}` : "";
                    return `**${v.authorName}** - ${stateName}${reason}`;
                })
                .join("\n");

            embed.addFields([
                {
                    name: "Votes Cast",
                    value:
                        votesList.length > 1024
                            ? votesList.substring(0, 1021) + "..."
                            : votesList,
                    inline: false,
                },
            ]);
        }

        return embed;
    }
}

module.exports = {
    motionService: new MotionService(),
    MotionResolution,
    CastVoteStatus,
};
