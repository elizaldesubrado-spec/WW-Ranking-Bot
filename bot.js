import { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } from "discord.js";

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("DISCORD_TOKEN environment variable is not set!");
  process.exit(1);
}

const RANK_ROLES = {
  "stage2-high": { label: "Stage 2 - High", roleId: "1469249991255130114" },
  "stage2-mid":  { label: "Stage 2 - Mid",  roleId: "1476487038906925137" },
  "stage2-low":  { label: "Stage 2 - Low",  roleId: "1469250317463060490" },
  "stage3":      { label: "Stage 3",         roleId: "1477991177654370490" },
};

const ALLOWED_ROLES = [
  "1469134599933395044", // Trial Host
  "1477852538291097732", // Trial Manager
  "1478234448137945098", // Trial Referee
  "1477851654639583282", // Referee
  "1478234674676498524", // Head of Referee
];

const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check the bot if it's online")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("say")
    .setDescription("WW RANKING")
    .addStringOption((o) => o.setName("message").setDescription("Message to send").setRequired(true))
    .toJSON(),
  new SlashCommandBuilder()
    .setName("unranked")
    .setDescription("Unranked user")
    .addUserOption((o) => o.setName("user").setDescription("User to remove all ranks from").setRequired(true))
    .addStringOption((o) =>
      o.setName("rank").setDescription("Rank assign").setRequired(true)
        .addChoices(
          { name: "Stage 2 - High", value: "stage2-high" },
          { name: "Stage 2 - Mid",  value: "stage2-mid"  },
          { name: "Stage 2 - Low",  value: "stage2-low"  },
          { name: "Stage 3",        value: "stage3"       }
        )
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("WW RANKING")
    .addUserOption((o) => o.setName("user").setDescription("User to assign the rank").setRequired(true))
    .addStringOption((o) =>
      o.setName("rank").setDescription("Rank assign").setRequired(true)
        .addChoices(
          { name: "Stage 2 - High", value: "stage2-high" },
          { name: "Stage 2 - Mid",  value: "stage2-mid"  },
          { name: "Stage 2 - Low",  value: "stage2-low"  },
          { name: "Stage 3",        value: "stage3"       }
        )
    )
    .toJSON(),
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`✅ Bot is online as ${readyClient.user.tag}`);
  const rest = new REST().setToken(token);
  await rest.put(Routes.applicationCommands(readyClient.user.id), { body: commands });
  console.log("✅ Slash commands registered");
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ping") {
    const latency = Date.now() - interaction.createdTimestamp;
    await interaction.reply({ content: `🟢 Bot is online! Latency: **${latency}ms**` });
  }

  if (interaction.commandName === "say") {
    const message = interaction.options.getString("message", true);
    await interaction.reply({ content: message });
  }

  if (interaction.commandName === "rank") {
    const caller = interaction.guild?.members.cache.get(interaction.user.id)
      ?? await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
    if (!caller?.roles.cache.some((r) => ALLOWED_ROLES.includes(r.id))) {
      await interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
      return;
    }
    const user = interaction.options.getUser("user", true);
    const rank = RANK_ROLES[interaction.options.getString("rank", true)];
    if (!rank) { await interaction.reply({ content: "Unknown rank.", ephemeral: true }); return; }
    const target = await interaction.guild?.members.fetch(user.id).catch(() => null);
    if (!target) { await interaction.reply({ content: "User not found.", ephemeral: true }); return; }
    const allRoleIds = Object.values(RANK_ROLES).map((r) => r.roleId);
    await target.roles.remove(allRoleIds).catch(() => null);
    await target.roles.add(rank.roleId);
    await interaction.reply({ content: `${user} has been ranked to **${rank.label}**`, allowedMentions: { users: [user.id] } });
  }

  if (interaction.commandName === "unranked") {
    const caller = interaction.guild?.members.cache.get(interaction.user.id)
      ?? await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
    if (!caller?.roles.cache.some((r) => ALLOWED_ROLES.includes(r.id))) {
      await interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
      return;
    }
    const user = interaction.options.getUser("user", true);
    const rank = RANK_ROLES[interaction.options.getString("rank", true)];
    if (!rank) { await interaction.reply({ content: "Unknown rank.", ephemeral: true }); return; }
    const target = await interaction.guild?.members.fetch(user.id).catch(() => null);
    if (!target) { await interaction.reply({ content: "User not found.", ephemeral: true }); return; }
    await target.roles.remove(rank.roleId).catch(() => null);
    await interaction.reply({ content: `${user} has been unranked to **${rank.label}**`, allowedMentions: { users: [user.id] } });
  }
});

client.on(Events.Error, (err) => console.error("Discord error:", err));

client.login(token);
    
