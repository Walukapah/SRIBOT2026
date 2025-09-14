const config = require('../config');
const { cmd } = require('../command');

cmd({
    pattern: "chrinfo",
    alias: ["channelinfo"],
    react: "ℹ️",
    desc: "Get WhatsApp channel information",
    category: "owner",
    use: '.chrinfo <channel-link>',
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        if (!isOwner) return reply("❌ Owner only command");
        if (!q) return reply(`Usage:\n${command} https://whatsapp.com/channel/1234567890`);

        const link = q.trim();
        if (!link.includes("whatsapp.com/channel/")) return reply("Invalid channel link format");

        const channelId = link.split('/')[4];
        if (!channelId) return reply("Invalid link - missing channel ID");

        const channelMeta = await conn.newsletterMetadata("invite", channelId);
        
        let infoText = `╭━━〔 *CHANNEL INFO* 〕━┈⊷
┃▸ *Name:* ${channelMeta.name || 'N/A'}
┃▸ *ID:* ${channelMeta.id}
┃▸ *Followers:* ${channelMeta.subscribersCount || 'N/A'}
┃▸ *Description:* ${channelMeta.description || 'N/A'}
┃▸ *Created At:* ${new Date(channelMeta.creationTime * 1000).toLocaleString()}
╰────────────────┈⊷

> *© Powered by ${config.BOT_NAME}*`;

        return reply(infoText);

    } catch (e) {
        console.error(e);
        reply(`❎ Error: ${e.message || "Failed to fetch channel info"}`);
    }
});
