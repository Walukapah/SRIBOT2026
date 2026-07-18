const { cmd } = require('../command');

cmd({
    pattern: "chi",
    alias: ["chjoin", "channeljoin"],
    react: "🔗",
    desc: "Join a WhatsApp channel by ID and get invite link",
    category: "owner",
    use: '.chi <newsletter-id>',
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        if (!isOwner) return reply("❌ Owner only command");
        if (!q) return reply(`Usage:\n${command} 120363165918432989@newsletter`);

        const newsletterId = q.trim();
        
        if (!newsletterId.endsWith('@newsletter')) {
            return reply("❌ Invalid newsletter ID. Must end with @newsletter");
        }

        // Join the newsletter/channel
        await conn.newsletterFollow(newsletterId);
        
        // Get metadata to get invite link
        const channelMeta = await conn.newsletterMetadata("jid", newsletterId);
        
        const name = channelMeta?.name || "Unknown Channel";
        const invite = channelMeta?.invite || "No invite link available";
        const subscribers = channelMeta?.subscribersCount || "N/A";
        
        const caption = `╭━━〔 *📢 CHANNEL JOINED* 〕━━┓
┃
┃ ✅ *Successfully Joined*
┃
┃ 📛 *Name:* ${name}
┃ 🆔 *ID:* ${newsletterId}
┃ 👥 *Subscribers:* ${subscribers}
┃
┃ 🔗 *Invite Link:*
┃ ${invite}
┃
┗━━━━━━━━━━━━━━━━━━━━┛

> *© SRI-BOT 🇱🇰*`;

        return reply(caption);

    } catch (e) {
        console.error('[CHI ERROR]', e);
        reply(`❎ Error: ${e.message || "Failed to join channel"}`);
    }
});
