# Bot Parlamentario

Bot de Discord para gestionar un "council" por canal: propuestas de mociones,
votacion (Aye/No/Abstencion), roles de councilor/dictator y estadisticas.

## Requisitos

- Node.js 18 o superior.
- Una aplicacion de Discord con un bot creado en el [Developer Portal](https://discord.com/developers/applications).
- El intent privilegiado **Server Members Intent** activado para el bot (pestana Bot del Developer Portal), necesario para calcular quien tiene derecho a voto.

## Instalacion

```bash
npm install
cp .env.example .env
```

Completa `.env` con:

- `DISCORD_TOKEN`: token del bot.
- `CLIENT_ID`: ID de la aplicacion.
- `GUILD_ID`: (opcional) ID del servidor para registrar los comandos solo ahi durante desarrollo. Si se omite, los comandos se registran globalmente (tarda hasta una hora en propagarse).
- `BOT_PREFIX`: prefijo del comando legacy `prefix` (por defecto `!`).

## Uso

Registrar los slash commands:

```bash
npm run deploy
```

Arrancar el bot:

```bash
npm start
```

## Comandos

- `/council create|remove|info` - crear, eliminar o consultar el council del canal.
- `/motion create|view|kill` - proponer, ver o cancelar la mocion activa.
- `/yes`, `/no`, `/abstain` - votar la mocion activa.
- `/voteconfig set|view` - configurar roles, cooldowns, mayorias y requisitos.
- `/votestats` - estadisticas del council.
- `/archive` - historial de mociones.
- `/help` - lista de comandos.
- `/ping` - latencia del bot.
