const config = require('../config');
const { cmd } = require('../command');

cmd({
    pattern: "menu3",
    desc: "Show bot command menu",
    category: "main",
    filename: __filename
},
async(conn, mek, m, {from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
    try {
        const startTime = conn.connectionTime || Date.now();
        const uptime = Math.floor((Date.now() - startTime) / 1000);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        // Send reaction first
        await m.react("👍");

        const title = '🪨 Hello, *"Itz: ZEUS-MINI"*';
        const text = `╭──◯\n` +
            `│ \`S T A T U S\`\n` +
            `│ *⦁ Name:* ZEUS-MINI\n` +
            `│ *⦁ Version:* 0.0001+\n` +
            `│ *⦁ Platform:* Heroku\n` +
            `│ *⦁ Uptime:* ${hours}h ${minutes}m ${seconds}s\n` +
            `╰──◯`;

        const sections = [
            {
                title: "MAIN COMMANDS",
                rows: [
                    { title: "BOT STATUS", description: "Show bot information", rowId: `${config.PREFIX}alive` },
                    { title: "SYSTEM INFO", description: "Show system details", rowId: `${config.PREFIX}system` },
                    { title: "PING TEST", description: "Check bot latency", rowId: `${config.PREFIX}ping` }
                ]
            },
            {
                title: "MEDIA DOWNLOAD",
                rows: [
                    { title: "DOWNLOAD SONG", description: "Download audio from YouTube", rowId: `${config.PREFIX}song` },
                    { title: "DOWNLOAD VIDEO", description: "Download video from YouTube", rowId: `${config.PREFIX}video` }
                ]
            },
            {
                title: "OTHER OPTIONS",
                rows: [
                    { title: "OWNER INFO", description: "Contact bot owner", rowId: `${config.PREFIX}owner` },
                    { title: "PREFERENCES", description: "Change bot settings", rowId: `${config.PREFIX}preferences` },
                    { title: "JOIN CHANNEL", description: "Get our channel link", rowId: `${config.PREFIX}channel` }
                ]
            }
        ];

        // First send the image
        await conn.sendMessage(from, {
            image: { url: config.MENU_IMG_URL },
            caption: text,
            footer: config.BOT_NAME
        }, { quoted: mek });

        // Then send the list message
        const listMessage = {
            image: { url: config.MENU_IMG_URL },
            caption: text,
            footer: config.BOT_NAME,
            title: "📋 COMMAND MENU",
            buttonText: "SELECT OPTION",
            sections: sections
        };

        return await conn.sendMessage(from, listMessage, { quoted: mek });

    } catch(e) {
        console.log("Menu error:", e);
        reply(`❌ Error loading menu: ${e.message}`);
    }
});
