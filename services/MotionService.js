const { EmbedBuilder } = require('discord.js');
const councilService = require('./CouncilService');

const MotionResolution = {
    Passed: 'passed',
    Failed: 'failed',
    Killed: 'killed',
    Expired: 'expired',
};

const CastVoteStatus = {
    Cast: 'cast',
    Changed: 'changed',
    Failed: 'failed',
};

const motionsByChannel = new Map();
const timers = new Map();

function getAllMotions(channelId) {
    return motionsByChannel.get(channelId) || [];
}

function getCurrentMotion(channelId) {
    const motions = getAllMotions(channelId);

    for (let i = motions.length - 1; i >= 0; i--) {
        if (motions[i].active) {
            return { motion: motions[i], index: i };
        }
    }

    return null;
}

function parseMotionOptions(inputText) {
    const options = {};
    const match = inputText.match(/\s*\[mayoria:(\d+(?:\.\d+)?)\]\s*$/i);

    if (!match) {
        return { text: inputText.trim(), options };
    }

    const percentage = parseFloat(match[1]);

    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        throw new Error('La mayoria debe estar entre 0 y 100.');
    }

    options.majority = percentage / 100;

    return { text: inputText.slice(0, match.index).trim(), options };
}

function scheduleExpiration(channelId, index, delay) {
    clearTimer(channelId, index);

    const timer = setTimeout(() => {
        const motions = getAllMotions(channelId);
        const motion = motions[index];

        if (motion && motion.active) {
            motion.active = false;
            motion.resolution = MotionResolution.Expired;
        }
    }, delay);

    if (typeof timer.unref === 'function') timer.unref();

    timers.set(`${channelId}:${index}`, timer);
}

function clearTimer(channelId, index) {
    const key = `${channelId}:${index}`;
    const timer = timers.get(key);

    if (timer) {
        clearTimeout(timer);
        timers.delete(key);
    }
}

function createMotion(channelId, { text, authorId, authorName, options }) {
    const council = councilService.getCouncil(channelId);

    const motion = {
        text,
        authorId,
        authorName,
        active: true,
        resolution: null,
        votes: [],
        majority: options.majority !== undefined ? options.majority : council.majorityDefault,
    };

    const motions = motionsByChannel.get(channelId) || [];
    motions.push(motion);
    motionsByChannel.set(channelId, motions);

    const index = motions.length - 1;

    if (council.motionExpiration) {
        scheduleExpiration(channelId, index, council.motionExpiration);
    }

    councilService.setUserCooldown(channelId, authorId);

    return { motion, index };
}

function killMotion(channelId, index) {
    const motions = getAllMotions(channelId);
    const motion = motions[index];
    if (!motion) return;

    motion.active = false;
    motion.resolution = MotionResolution.Killed;
    clearTimer(channelId, index);
}

function resolveMotion(channelId, index, resolution) {
    const motions = getAllMotions(channelId);
    const motion = motions[index];
    if (!motion) return;

    motion.active = false;
    motion.resolution = resolution;
    clearTimer(channelId, index);
}

function tallyVotes(motion) {
    let aye = 0;
    let no = 0;
    let abstain = 0;

    for (const vote of motion.votes) {
        if (vote.state === 1) aye++;
        else if (vote.state === -1) no++;
        else abstain++;
    }

    return { aye, no, abstain };
}

function castVote(channelId, index, vote, weights) {
    const motions = getAllMotions(channelId);
    const motion = motions[index];

    if (!motion || !motion.active) {
        return CastVoteStatus.Failed;
    }

    const existingIndex = motion.votes.findIndex((v) => v.authorId === vote.authorId);
    let status;

    if (existingIndex !== -1) {
        motion.votes[existingIndex] = vote;
        status = CastVoteStatus.Changed;
    } else {
        motion.votes.push(vote);
        status = CastVoteStatus.Cast;
    }

    if (vote.isDictator) {
        resolveMotion(
            channelId,
            index,
            vote.state === 1 ? MotionResolution.Passed : MotionResolution.Failed,
        );
        return status;
    }

    const council = councilService.getCouncil(channelId);
    const { aye, no, abstain } = tallyVotes(motion);
    const total = weights.total || 0;

    if (total > 0) {
        if (council.majorityReachedEnds) {
            if (aye / total >= motion.majority) {
                resolveMotion(channelId, index, MotionResolution.Passed);
            } else if (no / total > 1 - motion.majority) {
                resolveMotion(channelId, index, MotionResolution.Failed);
            }
        } else if (aye + no + abstain >= total) {
            resolveMotion(
                channelId,
                index,
                aye / total >= motion.majority ? MotionResolution.Passed : MotionResolution.Failed,
            );
        }
    }

    return status;
}

function resolutionLabel(resolution) {
    switch (resolution) {
        case MotionResolution.Passed:
            return 'Aprobada';
        case MotionResolution.Failed:
            return 'Rechazada';
        case MotionResolution.Killed:
            return 'Cancelada';
        case MotionResolution.Expired:
            return 'Expirada';
        default:
            return 'Activa';
    }
}

function resolutionColor(resolution) {
    switch (resolution) {
        case MotionResolution.Passed:
            return 0x2ecc71;
        case MotionResolution.Failed:
            return 0xe74c3c;
        case MotionResolution.Killed:
        case MotionResolution.Expired:
            return 0x95a5a6;
        default:
            return 0x3498db;
    }
}

function createMotionEmbed(channelId, index, weights) {
    const motions = getAllMotions(channelId);
    const motion = motions[index];

    const embed = new EmbedBuilder()
        .setTitle(`Mocion #${index + 1}`)
        .setDescription(motion.text)
        .setColor(resolutionColor(motion.resolution))
        .addFields(
            { name: 'Autor', value: motion.authorName, inline: true },
            { name: 'Estado', value: resolutionLabel(motion.resolution), inline: true },
            { name: 'Mayoria requerida', value: `${(motion.majority * 100).toFixed(0)}%`, inline: true },
        );

    const { aye, no, abstain } = tallyVotes(motion);
    const total = weights.total || 0;

    embed.addFields({
        name: 'Votos',
        value: `Aye: ${aye}\nNo: ${no}\nAbstenciones: ${abstain}\nTotal con derecho a voto: ${total}`,
    });

    if (motion.votes.length > 0) {
        const voteLines = motion.votes.map((vote) => {
            const reason = vote.reason ? ` - ${vote.reason}` : '';
            return `${vote.authorName}: ${vote.name}${reason}`;
        });

        embed.addFields({ name: 'Detalle de votos', value: voteLines.join('\n').slice(0, 1024) });
    }

    return embed;
}

module.exports = {
    motionService: {
        getAllMotions,
        getCurrentMotion,
        parseMotionOptions,
        createMotion,
        killMotion,
        castVote,
        createMotionEmbed,
    },
    MotionResolution,
    CastVoteStatus,
};
