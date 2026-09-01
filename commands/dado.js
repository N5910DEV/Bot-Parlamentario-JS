const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {

  data: new SlashCommandBuilder()
  .setName("dado")
  .setDescription("Lanza un dado")
  .addIntegerOption(option => 
      option.setName('caras')
          .setDescription('Número de caras del dado (por defecto 6)')
          .setRequired(false)
  ),
  async execute(interaction) {
      const caras = interaction.options.getInteger('caras') ?? 6;

      if (caras <= 1) {
          return interaction.reply({ content: 'El dado debe tener al menos 2 caras.', ephemeral: true });
      }

      const resultado = Math.floor(Math.random() * caras) + 1;

      await interaction.reply(`🎲 Tiraste un dado de ${caras} caras y salió: **${resultado}**`);
  },
}