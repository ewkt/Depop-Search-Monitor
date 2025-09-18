import dotenv from 'dotenv';
import { Client, GatewayIntentBits } from 'discord.js';

import { depopMonitor } from "./src/monitor.js";

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

//connect the bot to the server
client.login(process.env.BOT_TOKEN);

//launch the bot
client.on("clientReady", async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    await depopMonitor.start(client);
});

