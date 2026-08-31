const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');
const config = require('./config');
const logger = require('./utils/logger');

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

const commands = commandFiles.map((file) => require(path.join(commandsPath, file)).data.toJSON());

const rest = new REST().setToken(config.bot.token);

(async () => {
    try {
        logger.info(`Registrando ${commands.length} comandos.`);

        const route = config.bot.guildId
            ? Routes.applicationGuildCommands(config.bot.clientId, config.bot.guildId)
            : Routes.applicationCommands(config.bot.clientId);

        const data = await rest.put(route, { body: commands });

        logger.info(`Se registraron ${data.length} comandos correctamente.`);
    } catch (error) {
        logger.error(`Error registrando comandos: ${error}`);
    }
})();
