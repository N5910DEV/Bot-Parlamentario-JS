const councils = new Map();
const cooldowns = new Map();

function createDefaultCouncil(name) {
    return {
        enabled: true,
        name,
        motions: [],
        councilorRole: null,
        dictatorRole: null,
        proposeRole: null,
        userCooldown: 24 * 3600000,
        motionExpiration: 48 * 3600000,
        majorityDefault: 0.5,
        majorityMinimum: 0.5,
        majorityReachedEnds: true,
        reasonRequiredYes: false,
        reasonRequiredNo: false,
        reasonRequiredAbstain: false,
        motionQueue: false,
    };
}

function getCouncil(channelId) {
    return councils.get(channelId) || { enabled: false };
}

function createCouncil(channelId, name) {
    const council = createDefaultCouncil(name);
    councils.set(channelId, council);
    return council;
}

function removeCouncil(channelId) {
    councils.delete(channelId);
    cooldowns.delete(channelId);
}

function setConfig(channelId, key, value) {
    const council = councils.get(channelId);
    if (!council) return;
    council[key] = value;
}

function calculateTotalWeight(channelId, membersCache) {
    const council = getCouncil(channelId);
    const weights = new Map();

    for (const member of membersCache.values()) {
        if (member.user.bot) continue;
        if (council.councilorRole && !member.roles.cache.has(council.councilorRole)) {
            continue;
        }
        weights.set(member.id, 1);
    }

    let total = 0;
    for (const weight of weights.values()) total += weight;

    return { total, weights };
}

function isUserOnCooldown(channelId, userId) {
    return getUserCooldown(channelId, userId) > 0;
}

function getUserCooldown(channelId, userId) {
    const channelCooldowns = cooldowns.get(channelId);
    if (!channelCooldowns) return 0;

    const expiresAt = channelCooldowns.get(userId);
    if (!expiresAt) return 0;

    const remaining = expiresAt - Date.now();
    return remaining > 0 ? remaining : 0;
}

function setUserCooldown(channelId, userId) {
    const council = getCouncil(channelId);
    if (!council.enabled || !council.userCooldown) return;

    let channelCooldowns = cooldowns.get(channelId);
    if (!channelCooldowns) {
        channelCooldowns = new Map();
        cooldowns.set(channelId, channelCooldowns);
    }

    channelCooldowns.set(userId, Date.now() + council.userCooldown);
}

module.exports = {
    getCouncil,
    createCouncil,
    removeCouncil,
    setConfig,
    calculateTotalWeight,
    isUserOnCooldown,
    getUserCooldown,
    setUserCooldown,
};
