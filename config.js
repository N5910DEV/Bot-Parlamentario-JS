require('dotenv').config({ quiet: true });

module.exports = {
    bot: {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.CLIENT_ID,
        guildId: process.env.GUILD_ID || null,
        prefix: process.env.BOT_PREFIX || '!',
    },
};
