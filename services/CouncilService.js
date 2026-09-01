const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const DEFAULT_COUNCIL_DATA = {
    enabled: false,
    name: 'Council',
    userCooldowns: {},
    motions: [],
    lastBackup: 0,
    userCooldown: 0,
    motionExpiration: 0,
    majorityMinimum: 0.5,
    majorityReachedEnds: true,
    reasonRequiredYes: true,
    reasonRequiredNo: true,
    reasonRequiredAbstain: false,
    majorityDefault: 0.5
};

class CouncilService {
    constructor() {
        this.dataDir = path.join(__dirname, '../data/votum');
        this.councils = new Map();
        this.ensureDataDirectory();
    }

    ensureDataDirectory() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    getDataPath(channelId) {
        return path.join(this.dataDir, `${channelId}.json`);
    }

    loadCouncil(channelId) {
        if (this.councils.has(channelId)) {
            return this.councils.get(channelId);
        }

        const dataPath = this.getDataPath(channelId);
        let data = { ...DEFAULT_COUNCIL_DATA };
        let migrated = false;

        if (fs.existsSync(dataPath)) {
            try {
                const fileData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
                data = { ...DEFAULT_COUNCIL_DATA, ...fileData };

                for (const key of [
                    'userCooldown',
                    'motionExpiration',
                    'majorityDefault',
                    'majorityMinimum',
                ]) {
                    if (typeof data[key] !== 'string') continue;

                    const numericValue = Number(data[key]);
                    if (!Number.isFinite(numericValue)) continue;

                    data[key] =
                        key === 'majorityDefault' ||
                        key === 'majorityMinimum'
                            ? numericValue > 1
                                ? numericValue / 100
                                : numericValue
                            : numericValue;
                    migrated = true;
                }

                logger.info(`Se cargo informacion del council de ${channelId}`);
            } catch (error) {
                logger.error(`Error cargando informacion del council de ${channelId}:`, error);
            }
        }

        this.councils.set(channelId, data);
        if (migrated) {
            this.saveCouncil(channelId);
        }
        return data;
    }

    saveCouncil(channelId) {
        const data = this.councils.get(channelId);
        if (!data) return;

        const dataPath = this.getDataPath(channelId);
        try {
            fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
            logger.info(`Se guardo informacion del council data de ${channelId}`);
        } catch (error) {
            logger.error(`Error guardando council data de ${channelId}:`, error);
        }
    }

    createCouncil(channelId, name = 'Council') {
        const council = this.loadCouncil(channelId);
        council.enabled = true;
        council.name = name;
        this.saveCouncil(channelId);
        return council;
    }

    removeCouncil(channelId) {
        const council = this.loadCouncil(channelId);
        council.enabled = false;
        this.saveCouncil(channelId);
        this.councils.delete(channelId);
    }

    getCouncil(channelId) {
        return this.loadCouncil(channelId);
    }

    isCouncilEnabled(channelId) {
        const council = this.loadCouncil(channelId);
        return council.enabled;
    }

    setConfig(channelId, key, value) {
        const council = this.loadCouncil(channelId);
        council[key] = value;
        this.saveCouncil(channelId);
    }

    getConfig(channelId, key) {
        const council = this.loadCouncil(channelId);
        return council[key];
    }

    getUserCooldown(channelId, userId) {
        const council = this.loadCouncil(channelId);
        const cooldownEnd = council.userCooldowns[userId] || 0;
        const remaining = cooldownEnd + council.userCooldown - Date.now();
        return remaining > 0 ? remaining : 0;
    }

    isUserOnCooldown(channelId, userId) {
        return this.getUserCooldown(channelId, userId) > 0;
    }

    setUserCooldown(channelId, userId, timestamp) {
        const council = this.loadCouncil(channelId);
        council.userCooldowns[userId] = timestamp;
        this.saveCouncil(channelId);
    }

    getVoteWeights(channelId) {
        const council = this.loadCouncil(channelId);
        return council.voteWeights || {};
    }

    calculateTotalWeight(channelId, guildMembers) {
        const voteWeights = this.getVoteWeights(channelId);
        const council = this.loadCouncil(channelId);
        
        let totalWeight = 0;
        const userWeights = {};

        for (const [memberId, member] of guildMembers) {
            if (member.user?.bot) {
                continue;
            }

            let weight = 1;

            for (const [roleId, roleWeight] of Object.entries(voteWeights)) {
                if (member.roles.cache.has(roleId)) {
                    weight = roleWeight;
                    break;
                }
            }

            if (voteWeights[memberId]) {
                weight = voteWeights[memberId];
            }

            if (council.councilorRole) {
                if (member.roles.cache.has(council.councilorRole)) {
                    userWeights[memberId] = weight;
                    totalWeight += weight;
                }
            } else {
                userWeights[memberId] = weight;
                totalWeight += weight;
            }
        }

        return { users: userWeights, total: totalWeight };
    }

    async calculateGuildTotalWeight(channelId, guild) {
        await guild.members.fetch();
        return this.calculateTotalWeight(channelId, guild.members.cache);
    }
}

module.exports = new CouncilService();